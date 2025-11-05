/**
 * Manages the lifecycle of asynchronous requests sent to the server.
 * It handles request ID generation, promise creation, timeouts,
 * and cancellation.
 */
class BridgeClient {
  #pendingRequests = new Map();
  #handlers = new Map();
  #nextRequestId = 0;
  #port;
  #portListener;

  constructor(port) {
    if (!port) throw new Error("BridgeClient requires a port.");
    this.#port = port;
  }

  /**
   * Registers a handler for a specific message type.
   */
  handle(type, handler) {
    this.#handlers.set(type, handler);
  }

  /**
   * Master message listener.
   */
  #onMessage(message) {
    switch (message.type) {
      // These are responses to requests *we* sent
      case 'response':
        this.#handleResponse(message);
        break;
      case 'progress':
        this.#handleProgress(message);
        break;

      // These are "push" events *from* the server
      default:
        const handler = this.#handlers.get(message.type);
        if (handler) {
          handler(message); // Pass the full message
        } else {
          console.warn(`BridgeClient: Received unhandled message type '${message.type}'`);
        }
    }
  }

  /**
   * Creates, sends, and manages a new request.
   * @returns {Promise<any>} A promise that resolves with the server's response data.
   */
  request(message, { timeoutMs, onProgress = null, token = null } = {}) {
    const requestId = this.#nextRequestId++;

    const promise = new Promise((resolve, reject) => {
      const timeoutId = timeoutMs && setTimeout(() => reject(new Error(`Request ${requestId} timed out.`)), timeoutMs);

      const cleanupAndResolve = (value) => {
        timeoutId && clearTimeout(timeoutId);
        this.#pendingRequests.delete(requestId);
        resolve(value);
      };

      const cleanupAndReject = (error) => {
        timeoutId && clearTimeout(timeoutId);
        this.#pendingRequests.delete(requestId);
        reject(error);
      };

      this.#pendingRequests.set(requestId, {
        resolve: cleanupAndResolve,
        reject: cleanupAndReject,
        handleProgress: onProgress
      });

      if (token) {
        token.onCancellationRequested(() => {
          this.#port.postMessage({ type: 'cancel', requestId });
          // Use the platform-standard generic AbortError
          cleanupAndReject(new DOMException('Request aborted', 'AbortError'));
        });
      }
    });

    // Get the message payload from the factory and send it
    const messagePayload = message(requestId);
    this.#port.postMessage(messagePayload);

    return promise;
  }

  #handleResponse({ requestId, data, error }) {
    const request = this.#pendingRequests.get(requestId);
    if (!request) return false;
    if (error) {
      request.reject(new Error(error));
    } else {
      request.resolve(data);
    }
    return true;
  }

  #handleProgress({ requestId, payload }) {
    const request = this.#pendingRequests.get(requestId);
    if (request && request.handleProgress) {
      request.handleProgress(payload);
    }
  }

  listen() {
    this.#portListener = this.#port.onDidReceiveMessage(this.#onMessage.bind(this));
  }

  dispose() {
    this.#portListener?.dispose();
    for (const [id, request] of this.#pendingRequests.entries()) {
      request.reject(new Error('Provider is being disposed.'));
    }
    this.#pendingRequests.clear();
  }
}

/**
 * This is the generic handler we register for all commands.
 * @param {string} commandId The command being run (e.g., 'synth.newContext')
 * @param {...any} args Contextual args from VS Code (e.g., URI from explorer)
 */
async function handleCommand({ vscode, bridgeClient }, commandId, ...args) {
  try {
    const response = await bridgeClient.request(id => ({
      type: 'runCommand',
      requestId: id,
      commandId,
      commandArgs: args,
    }));

    if (!response.function) {
      // This was a pure server-side action that required no
      // client UI. We're done.
      if (response.message) {
        vscode.window.showInformationMessage(response.message);
      }
      return;
    }

    // We received a function string. Execute it.
    const factoryFn = (new Function('return ' + response.function))();
    const workerFn = factoryFn(...(response.params || []));

    // The workerFn is (vscode, bridgeClient).
    // It needs the bridgeClient to send *new* messages.
    await workerFn(vscode, bridgeClient);
  } catch (e) {
    // Catches errors from the Stage 1 request
    vscode.window.showErrorMessage(`Command Error: ${e.message}`);
    console.error(e);
  }
};

/**
 * --- "Dumb" Cache ---
 * A dedicated class to manage the in-memory file/directory metadata cache.
 * It is a purely reactive reflection of the server's authoritative state.
 * It is ONLY used for 'stat' and client-side 'fileSearch'.
 */
class StatCache {
  #stat = new Map();
  #uriForPath;
  #FileType;
  #FileChangeType;

  constructor(uriForPath, {FileType, FileChangeType}) {
    this.#FileType = FileType
    this.#FileChangeType = FileChangeType
    this.#uriForPath = uriForPath;
    this.#stat.set('/', { type: this.#FileType.Directory, ctime: Date.now(), mtime: Date.now(), size: 0 });
  }

  stat(path) {
    path = path || '/'
    return this.#stat.get(path);
  }

  applyState(newState) {
    const notifications = [];
    const oldPaths = new Set(this.#stat.keys());
    const newStat = new Map();
    newStat.set('/', this.#stat.get('/')); // Keep root
    oldPaths.delete('/');

    for (const [path, metadata] of newState.entries()) {
      const uri = this.#uriForPath(path);
      const oldEntry = this.#stat.get(path);

      const newEntry = {
        type: metadata.type === 'directory' ? this.#FileType.Directory : this.#FileType.File,
        ctime: metadata.ctime,
        mtime: metadata.mtime,
        size: metadata.size,
        unitType: metadata.unitType
      };
      newStat.set(path, newEntry);

      if (oldEntry) {
        if (oldEntry.mtime !== newEntry.mtime || oldEntry.size !== newEntry.size) {
          notifications.push({ uri, type: this.#FileChangeType.Changed });
        }
      } else {
        notifications.push({ uri, type: this.#FileChangeType.Created });
      }
      oldPaths.delete(path);
    }

    for (const path of oldPaths) {
      notifications.push({ uri: this.#uriForPath(path), type: this.#FileChangeType.Deleted });
    }

    this.#stat = newStat;
    notifications.push({ uri: this.#uriForPath('/'), type: this.#FileChangeType.Changed });
    return notifications;
  }

  applyWrite(data) {
    const notifications = [];
    const { set, deleted } = data;

    if (deleted) {
      for (const path of deleted) {
        if (this.#stat.delete(path)) {
          notifications.push({
            uri: this.#uriForPath(path),
            type: this.#FileChangeType.Deleted
          });
        }
      }
    }

    if (set) {
      for (const [path, metadata] of set.entries()) {
        const uri = this.#uriForPath(path);
        const oldEntry = this.#stat.get(path);

        const newEntry = {
          type: metadata.type === 'directory' ? this.#FileType.Directory : this.#FileType.File,
          ctime: metadata.ctime, mtime: metadata.mtime, size: metadata.size,
          unitType: metadata.unitType
        };
        this.#stat.set(path, newEntry);

        if (oldEntry) {
          notifications.push({ uri, type: this.#FileChangeType.Changed });
        } else {
          notifications.push({ uri, type: this.#FileChangeType.Created });
        }
      }
    }

    const parents = new Set();
    for (const n of notifications) {
      const parent = getParentPath(n.uri.path);
      if (parent) parents.add(parent);
    }
    for (const p of parents) {
      notifications.push({
        uri: this.#uriForPath(path),
        type: this.#FileChangeType.Changed
      });
    }

    return notifications;
  }

  * statEntries() {
    for (const [path, stat] of this.#stat.entries()) {
      yield [path, stat];
    }
  }
}

function getParentPath(path) {
  const cleanPath = (path.endsWith('/') && path.length > 1) ? path.substring(0, path.length - 1) : path;
  const lastSlash = cleanPath.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return cleanPath.substring(0, lastSlash);
}


/**
 * A FileSystemProvider that acts as a thin "controller".
 * It delegates state management to StatCache and async logic
 * to BridgeClient.
 */
class Provider /* implements vscode.FileSystemProvider */ {
  static scheme = 'synth';
  onDidChangeFile;
  #authority;
  #vscode;
  #emitter;
  #watchers = new Map();
  #cache;
  #bridgeClient;

  constructor(vscode, bridgeClient) {
    if (!vscode) throw new Error('A vscode module instance must be provided.');
    if (!bridgeClient) throw new Error('A BridgeClient instance must be provided.');
    this.#authority = undefined
    this.#vscode = vscode;
    this.#bridgeClient = bridgeClient;
    this.#emitter = new vscode.EventEmitter();
    this.#cache = new StatCache(path => this.#vscode.Uri.from({scheme: this.scheme, authority: this.#authority, path}), vscode);
    this.onDidChangeFile = this.#emitter.event;
  }

  dispose() {
    this.#emitter.dispose();
    this.#watchers.clear();
    this.#bridgeClient.dispose();
  }

  async applyRestore() {
    try {
      const data = await this.#bridgeClient.request(id => ({ type: 'getState', requestId: id }));
      const notifications = this.#cache.applyState(data.state);
      this.#emitter.fire(notifications);
    } catch (e) {
      console.error("Failed to restore state:", e);
    }
  }

  applyWrite(data) {
    const notifications = this.#cache.applyWrite(data);
    if (notifications.length > 0) {
      this.#emitter.fire(notifications);
    }
  }

  get scheme() { return this.constructor.scheme }

  watch(uri, options) {
    const path = uri.path;
    let watcherCount = this.#watchers.get(path) || 0;
    this.#watchers.set(path, ++watcherCount);
    return {
      dispose: () => {
        let count = this.#watchers.get(path) || 0;
        if (count > 1) this.#watchers.set(path, --count);
        else this.#watchers.delete(path);
      }
    };
  }

  stat(uri) {
    const entry = this.#cache.stat(uri.path);
    if (entry) return entry;
    throw this.#vscode.FileSystemError.FileNotFound(uri);
  }

  async readDirectory(uri) {
    this.stat(uri); // Fail fast
    const path = uri.path || '/'
    const data = await this.#bridgeClient.request(id => ({ type: 'readDirectory', path, requestId: id }));
    return data.entries.map(([name, type]) => {
      return [name, type === 'directory' ? this.#vscode.FileType.Directory : this.#vscode.FileType.File];
    });
  }

  async createDirectory(uri) {
    await this.#bridgeClient.request(id => ({ type: 'createDirectory', requestId: id, path: uri.path }));
  }

  async readFile(uri) {
    this.stat(uri);
    const data = await this.#bridgeClient.request(id => ({ type: 'readFile', path: uri.path, requestId: id }));
    return new TextEncoder().encode(data.content);
  }

  async writeFile(uri, content, options) {
    const contentString = new TextDecoder().decode(content);
    let typeHint;
    const openDoc = this.#vscode.workspace.textDocuments.find(
      doc => doc.uri.path === uri.path
    );
    if (openDoc) typeHint = openDoc.languageId;

    await this.#bridgeClient.request(id => ({
      type: 'writeFile',
      requestId: id,
      path: uri.path,
      content: contentString,
      typeHint: typeHint,
      options: options
    }));
  }

  async delete(uri, options) {
    this.stat(uri);
    await this.#bridgeClient.request(id => ({
      type: 'delete',
      requestId: id,
      path: uri.path,
      options: options
    }));
  }

  async rename(oldUri, newUri, options) {
    this.stat(oldUri);
    await this.#bridgeClient.request(id => ({
      type: 'rename',
      requestId: id,
      oldPath: oldUri.path,
      newPath: newUri.path,
      options: options,
    }));
  }

  async provideTextSearchResults(query, options, progress, token) {
    const onProgress = (payload) => {
      progress.report({
        uri: this.#vscode.Uri.from({ scheme: this.scheme, authority: this.#authority, path: payload.uriPath }),

        ranges: payload.ranges.map(r => new this.#vscode.Range(
          r.sourceRange.start.line,
          r.sourceRange.start.character,
          r.sourceRange.end.line,
          r.sourceRange.end.character
        )),

        preview: {
          text: payload.previewText,
          // The ranges *relative to the preview text*
          matches: payload.ranges.map(r => new this.#vscode.Range(
            r.previewRange.start.line,
            r.previewRange.start.character,
            r.previewRange.end.line,
            r.previewRange.end.character
          )),
        }
      });
    };

    return await this.#bridgeClient.request(id => ({
      type: 'provideTextSearchResults',
      requestId: id,
      query: {
        pattern: query.pattern,
        isRegExp: !!query.isRegExp,
        isCaseSensitive: !!query.isCaseSensitive,
        isWordMatch: !!query.isWordMatch
      },
      options: {
        excludes: options.excludes,
        includes: options.includes,
        maxResults: options.maxResults
      }
    }), { onProgress, token });
  }

  provideFileSearchResults(query, options, token) {
    const results = [];
    const searchPattern = query.pattern.toLowerCase();
    for (const [path, stat] of this.#cache.statEntries()) {
      if (token.isCancellationRequested) break;
      if (stat.type === this.#vscode.FileType.File && path.toLowerCase().includes(searchPattern)) {
        results.push(this.#vscode.Uri.from({ scheme: this.scheme, authority: this.#authority, path: path }));
      }
      if (options.maxResults && results.length >= options.maxResults) break;
    }
    return Promise.resolve(results);
  }
}

const vscode = require('vscode')

async function activate(context) {
  try {
    const port = context.messagePassingProtocol;

    const bridgeClient = new BridgeClient(port);

    const provider = new Provider(vscode, bridgeClient);
    bridgeClient.handle('restore', async (message) => await provider.applyRestore());
    bridgeClient.handle('write', (message) => provider.applyWrite(message.data));

    bridgeClient.listen();

    // load initial state
    await provider.applyRestore();

    // grab list of commands from extension package.json
    const pkgJson = context.extension.packageJSON;
    const commands = (pkgJson.contributes?.commands || []).map(({command}) => command)

    context.subscriptions.push(
      provider,
      vscode.workspace.registerFileSystemProvider(provider.scheme, provider, { isCaseSensitive: true }),
      vscode.workspace.registerTextSearchProvider(provider.scheme, provider),
      vscode.workspace.registerFileSearchProvider(provider.scheme, provider),
      ...commands.map(commandId => vscode.commands.registerCommand(commandId, handleCommand.bind(null, { vscode, bridgeClient }, commandId))),
    );
  } catch (e) {
    vscode.window.showErrorMessage(`Failed to initialize Synth workspace: ${e.message}`);
    console.error(e);
  }
}

function deactivate() {
  console.log('EXTENSION IS DEACTIVATING NOW!');
}

exports.activate = activate;
exports.deactivate = deactivate;
