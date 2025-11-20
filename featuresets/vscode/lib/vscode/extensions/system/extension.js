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
 * --- Tree (The Shard) ---
 * Manages file state for a SINGLE authority.
 * Uses #uriForPath to generate concrete VS Code events.
 */
class Tree {
  #stat = new Map(); // Map<path, stat>
  #uriForPath;        // Function: path -> vscode.Uri
  #FileType;
  #FileChangeType;

  constructor(uriForPath, { FileType, FileChangeType }) {
    this.#uriForPath = uriForPath;
    this.#FileType = FileType;
    this.#FileChangeType = FileChangeType;
    // Always initialize with a root directory
    this.#stat.set('/', { type: this.#FileType.Directory, ctime: Date.now(), mtime: Date.now(), size: 0 });
  }

  get(path) {
    return this.#stat.get(path || '/');
  }

  /**
   * Replaces the entire tree state (Restore event).
   * Correctly diffs against previous state to send Delete events.
   */
  replace(state) {
    const notifications = [];
    const now = Date.now();

    // Snapshot old paths to track deletions
    const oldPaths = new Set(this.#stat.keys());
    oldPaths.delete('/'); // Root is persistent

    // Clear and Reset Root
    this.#stat.clear();
    this.#stat.set('/', { type: this.#FileType.Directory, ctime: now, mtime: now, size: 0 });
    notifications.push({ uri: this.#uriForPath('/'), type: this.#FileChangeType.Changed });

    // Process New State
    for (const [path, metadata] of state.entries()) {
      const uri = this.#uriForPath(path);
      const newEntry = {
        type: metadata.type === 'directory' ? this.#FileType.Directory : this.#FileType.File,
        ctime: metadata.ctime, mtime: metadata.mtime, size: metadata.size, unitType: metadata.unitType
      };
      this.#stat.set(path, newEntry);

      if (oldPaths.has(path)) {
        // Existed before: Change
        notifications.push({ uri, type: this.#FileChangeType.Changed });
        oldPaths.delete(path); // Mark as handled
      } else {
        // New file: Create
        notifications.push({ uri, type: this.#FileChangeType.Created });
      }
    }

    // Process Deletions
    // Any path remaining in oldPaths was not in the new state
    for (const path of oldPaths) {
      notifications.push({
        uri: this.#uriForPath(path),
        type: this.#FileChangeType.Deleted
      });
    }

    return notifications;
  }

  /**
   * Updates specific files (Write event).
   */
  update({ set, deleted }) {
    const notifications = [];

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
          ctime: metadata.ctime, mtime: metadata.mtime, size: metadata.size, unitType: metadata.unitType
        };
        this.#stat.set(path, newEntry);

        if (oldEntry) {
          if (oldEntry.mtime !== newEntry.mtime || oldEntry.size !== newEntry.size) {
            notifications.push({ uri, type: this.#FileChangeType.Changed });
          }
        } else {
          notifications.push({ uri, type: this.#FileChangeType.Created });
        }
      }
    }

    // Always notify root change
    notifications.push({
      uri: this.#uriForPath('/'),
      type: this.#FileChangeType.Changed
    });

    return notifications;
  }

  /**
   * Iterator for search.
   */
  * entries() {
    for (const entry of this.#stat.entries()) {
      yield entry;
    }
  }
}


/**
 * --- Forest (The Manager) ---
 * Routes requests to the correct Tree based on URI Authority.
 */
class Forest {
  #trees = new Map(); // Map<authority, Tree>
  #vscode;

  constructor(vscode) {
    this.#vscode = vscode;
  }

  /**
   * Lazy-loads a Tree for the given authority.
   * Injects the specific URI factory for that authority.
   */
  #getTree(authority) {
    if (!this.#trees.has(authority)) {
      const uriFactory = (path) => this.#vscode.Uri.from({ scheme: 'synth', authority, path });
      this.#trees.set(authority, new Tree(uriFactory, this.#vscode));
    }
    return this.#trees.get(authority);
  }

  stat(uri) {
    const tree = this.#getTree(uri.authority);
    return tree.get(uri.path);
  }

  applyState(authority, state) {
    // Tree returns fully formed { uri, type } events now
    return this.#getTree(authority).replace(state);
  }

  applyWrite(authority, data) {
    return this.#getTree(authority).update(data);
  }

  /**
   * Global iterator for "File Search" across all trees.
   * Yields [fullUriString, stat]
   */
  * statEntries() {
    for (const [authority, tree] of this.#trees.entries()) {
      for (const [path, stat] of tree.entries()) {
        const uriStr = `synth://${authority}${path}`;
        yield [uriStr, stat];
      }
    }
  }
}

class Provider {
  static scheme = 'synth';
  onDidChangeFile;
  #vscode;
  #emitter;
  #cache;
  #bridgeClient;

  constructor(vscode, bridgeClient) {
    this.#vscode = vscode;
    this.#bridgeClient = bridgeClient;
    this.#emitter = new vscode.EventEmitter();
    this.#cache = new Forest(vscode);
    this.onDidChangeFile = this.#emitter.event;
  }

  dispose() {
    this.#emitter.dispose();
    this.#bridgeClient.dispose();
  }

  async applyRestore(authority) {
    const auth = authority || 'root';
    try {
      const uri = `synth://${auth}/`;
      const data = await this.#bridgeClient.request(id => ({ type: 'getState', uri, requestId: id }));
      const notifications = this.#cache.applyState(auth, data.state);
      this.#emitter.fire(notifications);
    } catch (e) {
      console.error(`Failed to restore state for ${auth}:`, e);
    }
  }

  applyWrite(authority, data) {
    const notifications = this.#cache.applyWrite(authority || 'root', data);
    if (notifications.length > 0) this.#emitter.fire(notifications);
  }

  get scheme() { return this.constructor.scheme }

  watch(uri) { return { dispose: () => { } }; }

  stat(uri) {
    const entry = this.#cache.stat(uri);
    if (entry) return entry;
    throw this.#vscode.FileSystemError.FileNotFound(uri);
  }

  async readDirectory(uri) {
    // Stat first to ensure existence (Forest lazy loads, so this is mostly a check)
    this.stat(uri);

    const data = await this.#bridgeClient.request(id => ({
      type: 'readDirectory',
      uri: uri.toString(),
      requestId: id
    }));
    return data.entries.map(([name, type]) => [
      name,
      type === 'directory' ? this.#vscode.FileType.Directory : this.#vscode.FileType.File
    ]);
  }

  async createDirectory(uri) {
    await this.#bridgeClient.request(id => ({ type: 'createDirectory', uri: uri.toString(), requestId: id }));
  }

  async readFile(uri) {
    const data = await this.#bridgeClient.request(id => ({ type: 'readFile', uri: uri.toString(), requestId: id }));
    return new TextEncoder().encode(data.content);
  }

  async writeFile(uri, content, options) {
    const openDoc = this.#vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    await this.#bridgeClient.request(id => ({
      type: 'writeFile',
      requestId: id,
      uri: uri.toString(),
      content: new TextDecoder().decode(content),
      typeHint: openDoc?.languageId,
      options
    }));
  }

  async delete(uri, options) {
    await this.#bridgeClient.request(id => ({ type: 'delete', uri: uri.toString(), options, requestId: id }));
  }

  async rename(oldUri, newUri, options) {
    await this.#bridgeClient.request(id => ({
      type: 'rename',
      oldUri: oldUri.toString(),
      newUri: newUri.toString(),
      options,
      requestId: id
    }));
  }

  async provideTextSearchResults(query, options, progress, token) {
    const contextUri = options.folder || this.#vscode.workspace.workspaceFolders?.[0]?.uri;

    if (!contextUri) {
      return { limitHit: false };
    }

    return await this.#bridgeClient.request(id => ({
      type: 'provideTextSearchResults',
      requestId: id,
      uri: contextUri.toString(),
      query: {
        pattern: query.pattern,
        isRegExp: !!query.isRegExp,
        isCaseSensitive: !!query.isCaseSensitive,
        isWordMatch: !!query.isWordMatch
      },
      options
    }), {
      token,
      onProgress: (payload) => {
        progress.report({
          uri: this.#vscode.Uri.parse(payload.uri),
          ranges: payload.ranges.map(r => new this.#vscode.Range(r.sourceRange.start.line, r.sourceRange.start.character, r.sourceRange.end.line, r.sourceRange.end.character)),
          preview: {
            text: payload.previewText,
            matches: payload.ranges.map(r => new this.#vscode.Range(r.previewRange.start.line, r.previewRange.start.character, r.previewRange.end.line, r.previewRange.end.character))
          }
        });
      }
    });
  }

  provideFileSearchResults(query, options, token) {
    const results = [];
    const searchPattern = query.pattern.toLowerCase();
    // Iterates the Forest to search all Trees
    for (const [uriStr, stat] of this.#cache.statEntries()) {
      if (token.isCancellationRequested) break;
      if (stat.type === this.#vscode.FileType.File && uriStr.toLowerCase().includes(searchPattern)) {
        results.push(this.#vscode.Uri.parse(uriStr));
      }
    }
    return Promise.resolve(results);
  }
}

function parseLocationFromStack(stack, testUri) {
  if (!stack) return undefined;

  const lines = stack.split('\n');
  // Look for lines that mention our file. 
  // Browsers formatted stacks differently, but usually contain "url:line:col"
  // Since we use 'synth' scheme, look for that.
  const targetPath = testUri.path;

  // Simple regex to find :line:col
  // Matches:  at foo (synth:/tests/mytest.js:10:5)  OR  tests/mytest.js:10:5
  for (const line of lines) {
    if (line.includes(targetPath)) {
      // extract :10:5
      const match = /:(\d+):(\d+)/.exec(line);
      if (match) {
        const row = parseInt(match[1]) - 1; // VS Code is 0-indexed
        const col = parseInt(match[2]) - 1;
        return new vscode.Range(row, col, row, col + 100);
      }
    }
  }
  // Fallback: Line 0
  return new vscode.Range(0, 0, 0, 0);
}

/**
 * --- Test Provider ---
 * Manages the Test Explorer UI.
 * Groups tests by Authority (Root) -> Target Unit -> Test File.
 */
class TestProvider {
  #controller;
  #bridgeClient;
  #vscode;

  constructor(vscode, bridgeClient) {
    this.#vscode = vscode;
    this.#bridgeClient = bridgeClient;

    this.#controller = vscode.tests.createTestController('synthTests', 'Synth Tests');

    this.#controller.resolveHandler = async (item) => {
      if (!item) {
        await this.discoverAllTests();
      }
    };

    this.#controller.createRunProfile(
      'Run Synth Tests',
      vscode.TestRunProfileKind.Run,
      (request, token) => this.runHandler(request, token)
    );
  }

  /**
   * Discovers tests across ALL mounted workspace folders (Authorities).
   */
  async discoverAllTests() {
    // 1. Get all mounted roots
    const folders = this.#vscode.workspace.workspaceFolders || [];
    const newRootItems = [];

    // 2. Query each root in parallel
    await Promise.all(folders.map(async (folder) => {
      const authority = folder.uri.authority; // e.g., "apps-frontend"

      // Create a container item for this Root (Authority)
      // This distinguishes tests in 'Frontend' from 'Backend' visually
      const rootItem = this.#controller.createTestItem(authority, folder.name, folder.uri);
      rootItem.canResolveChildren = false;
      newRootItems.push(rootItem);

      try {
        // Request discovery specifically for this authority
        const { tests } = await this.#bridgeClient.request(id => ({
          type: 'discoverTests',
          requestId: id,
          uri: folder.uri.toString() // Route to specific synth
        }));

        // Build the tree for this authority
        const targetNodes = new Map();

        for (const { testName, targetName } of tests) {
          // A. Target Node (Grouping)
          // ID must be unique globally, so prefix with authority
          const targetId = `${authority}:${targetName}`;
          let targetNode = targetNodes.get(targetName);

          if (!targetNode) {
            const uri = this.#vscode.Uri.from({ scheme: 'synth', authority, path: `/${targetName}` });
            targetNode = this.#controller.createTestItem(targetId, targetName, uri);
            targetNodes.set(targetName, targetNode);
            rootItem.children.add(targetNode);
          }

          // B. Test Node (Leaf)
          const testId = `${authority}:${testName}`;
          const testUri = this.#vscode.Uri.from({ scheme: 'synth', authority, path: `/${testName}` });
          const testItem = this.#controller.createTestItem(testId, testName, testUri);

          targetNode.children.add(testItem);
        }
      } catch (e) {
        console.error(`Failed to discover tests for ${authority}:`, e);
        rootItem.error = e.message;
      }
    }));

    // 3. Replace items
    this.#controller.items.replace(newRootItems);
  }

  /**
   * Handles the Run Request.
   * Groups items by Authority and dispatches separate runs.
   */
  async runHandler(request, token) {
    const run = this.#controller.createTestRun(request);
    const queue = [];

    // 1. Populate Queue
    if (request.include) {
      request.include.forEach(item => queue.push(item));
    } else {
      this.#controller.items.forEach(item => queue.push(item));
    }

    // 2. Flatten and Group by Authority
    // Map<Authority, Set<TestName>>
    const testsByAuthority = new Map();

    while (queue.length > 0) {
      const item = queue.shift();

      if (item.children.size > 0) {
        item.children.forEach(child => queue.push(child));
      } else {
        if (request.exclude && request.exclude.includes(item)) continue;

        // The item.uri.authority tells us which Synth owns this test
        const auth = item.uri.authority;
        if (!testsByAuthority.has(auth)) {
          testsByAuthority.set(auth, new Set());
        }

        // We need the raw name (e.g., "src/foo.test.js") for the adapter,
        // NOT the global ID we created earlier.
        // Since item.label is the testName, use that.
        testsByAuthority.get(auth).add(item.label);

        run.enqueued(item);
      }
    }

    // 3. Execute Batches
    const promises = [];

    for (const [authority, testSet] of testsByAuthority) {
      const testNamesToRun = Array.from(testSet);
      const uriStr = `synth://${authority}/`; // Routing hint

      const task = this.#bridgeClient.request(id => ({
        type: 'runTests',
        requestId: id,
        uri: uriStr, // Route to the correct synth
        testIds: testNamesToRun
      }), {
        token,
        onProgress: (event) => this.#handleTestProgress(run, authority, event)
      }).catch(e => {
        if (e.name !== 'AbortError') {
          this.#vscode.window.showErrorMessage(`Test Run Failed (${authority}): ${e.message}`);
          run.appendOutput(`\r\nError in ${authority}: ${e.message}\r\n`);
        }
      });

      promises.push(task);
    }

    await Promise.all(promises);
    run.end();
  }

  /**
   * Processes events from the bridge and updates VS Code UI.
   */
  #handleTestProgress(run, authority, event) {
    // Reconstruct the unique ID we used during discovery: "authority:testName"
    const uniqueId = event.testId ? `${authority}:${event.testId}` : undefined;
    const item = uniqueId ? this.#findTestItem(uniqueId) : undefined;

    switch (event.type) {
      case 'test-output':
        const text = event.message.replace(/(?<!\r)\n/g, '\r\n');
        run.appendOutput(text, null, item);
        break;
      case 'test-start':
        if (item) run.started(item);
        break;
      case 'test-pass':
        if (item) run.passed(item, event.duration);
        break;
      case 'test-fail':
        let message;
        if (event.expected && event.actual) {
          message = this.#vscode.TestMessage.diff(
            event.message,
            JSON.stringify(event.expected, null, 2),
            JSON.stringify(event.actual, null, 2),
          );
        } else {
          message = new this.#vscode.TestMessage(event.message);
        }

        if (item) {
          // Parse location from stack if possible
          if (event.stack) {
            const range = parseLocationFromStack(event.stack, item.uri);
            message.location = new this.#vscode.Location(item.uri, range);
          } else {
            message.location = new this.#vscode.Location(item.uri, new this.#vscode.Position(0, 0));
          }
          run.failed(item, message, event.duration);
        } else {
          run.appendOutput(`\r\nFailed: ${event.message}\r\n`);
        }
        break;
    }
  }

  // Helper to find item in the 3-level hierarchy (Root -> Target -> Test)
  #findTestItem(uniqueId) {
    // BFS or recursive search
    const search = (collection) => {
      const direct = collection.get(uniqueId);
      if (direct) return direct;
      for (const [_, child] of collection) {
        if (child.children.size > 0) {
          const found = search(child.children);
          if (found) return found;
        }
      }
    };
    return search(this.#controller.items);
  }

  dispose() {
    this.#controller.dispose();
  }
}

const vscode = require('vscode')

async function activate(context) {
  try {
    const port = context.messagePassingProtocol;

    const bridgeClient = new BridgeClient(port);

    const provider = new Provider(vscode, bridgeClient);
    const testProvider = new TestProvider(vscode, bridgeClient);

    bridgeClient.handle('restore', async (msg) => await provider.applyRestore(msg.authority));
    bridgeClient.handle('write', (msg) => provider.applyWrite(msg.authority, msg.data));

    bridgeClient.listen();

    // --- MULTI-ROOT STARTUP SEQUENCE ---

    // Register Providers
    context.subscriptions.push(
      provider,
      testProvider,
      vscode.workspace.registerFileSystemProvider(provider.scheme, provider, { isCaseSensitive: true }),
      vscode.workspace.registerTextSearchProvider(provider.scheme, provider),
      vscode.workspace.registerFileSearchProvider(provider.scheme, provider),
    );

    // Discover Roots from Host
    const { roots } = await bridgeClient.request(id => ({ type: 'getRoots', requestId: id }));

    // Mount discovered synths as Workspace Folders
    const workspaceFolders = roots.map(root => ({
      uri: vscode.Uri.from({ scheme: 'synth', authority: root.authority, path: '/' }),
      name: root.name // e.g. "/" or "/apps/frontend"
    }));

    // Replace current folders (if any) with the new fleet
    const currentCount = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0;
    vscode.workspace.updateWorkspaceFolders(0, currentCount, ...workspaceFolders);

    // Initialize State for all roots in parallel
    await Promise.all(roots.map(root => provider.applyRestore(root.authority)));

    // Register Commands
    const commands = (context.extension.packageJSON.contributes?.commands || []).map(c => c.command);
    context.subscriptions.push(
      ...commands.map(id => vscode.commands.registerCommand(id, handleCommand.bind(null, { vscode, bridgeClient }, id)))
    );

  } catch (e) {
    vscode.window.showErrorMessage(`Synth Init Error: ${e.message}`);
    console.error(e);
  }
}

function deactivate() {
  console.log('EXTENSION IS DEACTIVATING NOW!');
}

exports.activate = activate;
exports.deactivate = deactivate;
