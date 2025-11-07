/**
 * Manages the lifecycle of asynchronous requests sent to the server.
 * It handles request ID generation, promise creation, timeouts,
 * and cancellation.
 */
class RequestManager {
  #pendingRequests = new Map();
  #nextRequestId = 0;
  #port;
  #vscode;

  constructor(port, vscode) {
    if (!port || !vscode) throw new Error("RequestManager requires a port and vscode API.");
    this.#port = port;
    this.#vscode = vscode;
  }

  create({ timeoutMs = 5000, onProgress = null, token = null } = {}) {
    const requestId = this.#nextRequestId++;
    const promise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request ${requestId} timed out.`));
      }, timeoutMs);
      const cleanupAndResolve = (value) => {
        clearTimeout(timeoutId);
        this.#pendingRequests.delete(requestId);
        resolve(value);
      };
      const cleanupAndReject = (error) => {
        clearTimeout(timeoutId);
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
          cleanupAndReject(this.#vscode.FileSystemError.Canceled());
        });
      }
    });
    return { promise, id: requestId };
  }

  handleResponse({ requestId, data, error }) {
    const request = this.#pendingRequests.get(requestId);
    if (!request) return false;
    if (error) {
      request.reject(new Error(error));
    } else {
      request.resolve(data);
    }
    return true;
  }

  handleProgress({ requestId, payload }) {
    const request = this.#pendingRequests.get(requestId);
    if (request && request.handleProgress) {
      request.handleProgress(payload);
    }
  }

  dispose() {
    for (const [id, request] of this.#pendingRequests.entries()) {
      request.reject(new Error('Provider is being disposed.'));
    }
    this.#pendingRequests.clear();
  }
}

/**
 * --- "Dumb" Cache ---
 * A dedicated class to manage the in-memory file/directory metadata cache.
 * It is a purely reactive reflection of the server's authoritative state.
 * It is ONLY used for 'stat' and client-side 'fileSearch'.
 */
class StatCache {
  #stat = new Map();
  #vscode;

  constructor(vscode) {
    this.#vscode = vscode;
    this.#stat.set('/', { type: this.#vscode.FileType.Directory, ctime: Date.now(), mtime: Date.now(), size: 0 });
  }

  stat(path) {
    const entry = this.#stat.get(path);
    if (entry) return entry;
    throw this.#vscode.FileSystemError.FileNotFound(path);
  }

  applyState(newState) {
    const notifications = [];
    const oldPaths = new Set(this.#stat.keys());
    const newStat = new Map();
    newStat.set('/', this.#stat.get('/')); // Keep root
    oldPaths.delete('/');

    for (const [path, metadata] of newState.entries()) {
      const uri = this.#vscode.Uri.from({ scheme: Provider.scheme, path: path });
      const oldEntry = this.#stat.get(path);

      const newEntry = {
        type: metadata.type === 'directory' ? this.#vscode.FileType.Directory : this.#vscode.FileType.File,
        ctime: metadata.ctime,
        mtime: metadata.mtime,
        size: metadata.size,
        unitType: metadata.unitType
      };
      newStat.set(path, newEntry);

      if (oldEntry) {
        if (oldEntry.mtime !== newEntry.mtime || oldEntry.size !== newEntry.size) {
          notifications.push({ uri, type: this.#vscode.FileChangeType.Changed });
        }
      } else {
        notifications.push({ uri, type: this.#vscode.FileChangeType.Created });
      }
      oldPaths.delete(path);
    }

    for (const path of oldPaths) {
      notifications.push({ uri: this.#vscode.Uri.from({ scheme: Provider.scheme, path: path }), type: this.#vscode.FileChangeType.Deleted });
    }

    this.#stat = newStat;
    notifications.push({ uri: this.#vscode.Uri.from({ scheme: Provider.scheme, path: '/' }), type: this.#vscode.FileChangeType.Changed });
    return notifications;
  }

  applyWrite(data) {
    const notifications = [];
    const { set, deleted } = data;

    if (deleted) {
      for (const path of deleted) {
        if (this.#stat.delete(path)) {
          notifications.push({
            uri: this.#vscode.Uri.from({ scheme: Provider.scheme, path: path }),
            type: this.#vscode.FileChangeType.Deleted
          });
        }
      }
    }

    if (set) {
      for (const [path, metadata] of set.entries()) {
        const uri = this.#vscode.Uri.from({ scheme: Provider.scheme, path: path });
        const oldEntry = this.#stat.get(path);

        const newEntry = {
          type: metadata.type === 'directory' ? this.#vscode.FileType.Directory : this.#vscode.FileType.File,
          ctime: metadata.ctime, mtime: metadata.mtime, size: metadata.size,
          unitType: metadata.unitType
        };
        this.#stat.set(path, newEntry);

        if (oldEntry) {
          notifications.push({ uri, type: this.#vscode.FileChangeType.Changed });
        } else {
          notifications.push({ uri, type: this.#vscode.FileChangeType.Created });
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
        uri: this.#vscode.Uri.from({ scheme: Provider.scheme, path: p }),
        type: this.#vscode.FileChangeType.Changed
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
 * to RequestManager.
 */
class Provider /* implements vscode.FileSystemProvider */ {
  static scheme = 'synth';
  #vscode;
  #emitter;
  onDidChangeFile;
  #port;
  #portListener;
  #watchers = new Map();
  #cache;
  #requestManager;

  constructor(vscode, port) {
    if (!vscode) throw new Error('A vscode module instance must be provided.');
    if (!port) throw new Error('A MessagePort instance must be provided.');
    this.#vscode = vscode;
    this.#port = port;
    this.#emitter = new vscode.EventEmitter();
    this.onDidChangeFile = this.#emitter.event;
    this.#cache = new StatCache(vscode);
    this.#requestManager = new RequestManager(port, vscode);
    this.#portListener = this.#port.onDidReceiveMessage(this.handleMessage.bind(this));
    (async () => {
      try {
        const { promise, id } = this.#requestManager.create({ timeoutMs: 10000 });
        this.#port.postMessage({ type: 'getState', requestId: id });
        const data = await promise;
        const notifications = this.#cache.applyState(data.state);
        this.#emitter.fire(notifications);
      } catch (e) {
        console.error("Failed to get initial state:", e);
        this.#vscode.window.showErrorMessage(`SynthFS: Failed to get initial state: ${e.message}`);
      }
    })();
  }

  dispose() {
    this.#portListener.dispose();
    this.#emitter.dispose();
    this.#watchers.clear();
    this.#requestManager.dispose();
  }

  handleMessage(message) {
    switch (message.type) {
      case 'restore':
        this.#handleExternalRestore();
        break;
      case 'write':
        this.#handleExternalWrite(message.data);
        break;
      case 'response':
        if (!this.#requestManager.handleResponse(message)) {
          console.warn(`Provider: Received response for unknown requestId: ${message.requestId}`);
        }
        break;
      case 'progress':
        this.#requestManager.handleProgress(message);
        break;
      default:
        console.warn(`Provider: Received unknown message type '${message.type}'`);
    }
  }

  async #handleExternalRestore() {
    try {
      const { promise, id } = this.#requestManager.create({ timeoutMs: 10000 });
      this.#port.postMessage({ type: 'getState', requestId: id });
      const data = await promise;
      const notifications = this.#cache.applyState(data.state);
      this.#emitter.fire(notifications);
    } catch (e) {
      console.error("Failed to restore state:", e);
    }
  }

  #handleExternalWrite(data) {
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
    return this.#cache.stat(uri.path);
  }

  async readDirectory(uri) {
    this.#cache.stat(uri.path); // Fail fast
    const { promise, id } = this.#requestManager.create({ timeoutMs: 5000 });
    this.#port.postMessage({
      type: 'readDirectory',
      path: uri.path,
      requestId: id
    });
    const data = await promise;
    return data.entries.map(([name, type]) => {
      return [name, type === 'directory' ? this.#vscode.FileType.Directory : this.#vscode.FileType.File];
    });
  }

  async createDirectory(uri) {
    const { promise, id } = this.#requestManager.create({ timeoutMs: 5000 });
    this.#port.postMessage({
      type: 'createDirectory',
      requestId: id,
      path: uri.path
    });
    await promise;
  }

  async readFile(uri) {
    this.#cache.stat(uri.path);
    const { promise, id } = this.#requestManager.create({ timeoutMs: 5000 });
    this.#port.postMessage({
      type: 'readFile',
      path: uri.path,
      requestId: id
    });
    const data = await promise;
    return new TextEncoder().encode(data.content);
  }

  async writeFile(uri, content, options) {
    const contentString = new TextDecoder().decode(content);
    let typeHint;
    const openDoc = this.#vscode.workspace.textDocuments.find(
      doc => doc.uri.path === uri.path
    );
    if (openDoc) typeHint = openDoc.languageId;

    const { promise, id } = this.#requestManager.create({ timeoutMs: 5000 });
    this.#port.postMessage({
      type: 'writeFile',
      requestId: id,
      path: uri.path,
      content: contentString,
      typeHint: typeHint,
      options: options // <-- THIS IS THE FIX
    });
    await promise;
  }

  async delete(uri, options) {
    this.#cache.stat(uri.path); // <-- ADD THIS LINE
    const { promise, id } = this.#requestManager.create({ timeoutMs: 10000 });
    this.#port.postMessage({
      type: 'delete',
      requestId: id,
      path: uri.path,
      options: options
    });
    await promise;
  }

  async rename(oldUri, newUri, options) {
    this.#cache.stat(oldUri.path); // <-- ADD THIS LINE (check the source)
    const { promise, id } = this.#requestManager.create({ timeoutMs: 10000 });
    this.#port.postMessage({
      type: 'rename',
      requestId: id,
      oldPath: oldUri.path,
      newPath: newUri.path,
      options: options
    });
    await promise;
  }

  // In class Provider

  provideTextSearchResults(query, options, progress, token) {

    // --- Fixed (Correct) Code ---

    const onProgress = (payload) => {
      // "Revive" the plain JSON ranges from the server into vscode.Range objects
      const sourceRanges = payload.ranges.map(r => new this.#vscode.Range(
        r.sourceRange.start.line,
        r.sourceRange.start.character,
        r.sourceRange.end.line,
        r.sourceRange.end.character
      ));

      const previewRanges = payload.ranges.map(r => new this.#vscode.Range(
        r.previewRange.start.line,
        r.previewRange.start.character,
        r.previewRange.end.line,
        r.previewRange.end.character
      ));

      // Report the result in the format VS Code expects (vscode.TextSearchMatch)
      progress.report({
        uri: this.#vscode.Uri.from({ scheme: this.scheme, path: payload.uriPath }),

        // 1. The ranges in the *full document*
        ranges: sourceRanges,

        // 2. The preview object
        preview: {
          text: payload.previewText,
          matches: previewRanges // The ranges *relative to the preview text*
        }
      });
    };

    const { promise, id } = this.#requestManager.create({
      // timeoutMs: 30000, 
      onProgress,
      token,
    });

    this.#port.postMessage({
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
    });
    return promise;
  }

  provideFileSearchResults(query, options, token) {
    const results = [];
    const searchPattern = query.pattern.toLowerCase();
    for (const [path, stat] of this.#cache.statEntries()) {
      if (token.isCancellationRequested) break;
      if (stat.type === this.#vscode.FileType.File && path.toLowerCase().includes(searchPattern)) {
        results.push(this.#vscode.Uri.from({ scheme: this.scheme, path: path }));
      }
      if (options.maxResults && results.length >= options.maxResults) break;
    }
    return Promise.resolve(results);
  }
}

const vscode = require('vscode')

function activate(context) {
  try {
    const port = context.messagePassingProtocol;
    console.log('EXTENSION IS ACTIVATING NOW!!!!', { context, port });
    const provider = new Provider(vscode, port);
    context.subscriptions.push(
      provider,
      vscode.workspace.registerFileSystemProvider(provider.scheme, provider, { isCaseSensitive: true }),
      vscode.workspace.registerTextSearchProvider(provider.scheme, provider),
      vscode.workspace.registerFileSearchProvider(provider.scheme, provider)
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
