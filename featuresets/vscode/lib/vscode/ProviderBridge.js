import FileSystemAdapter from "@/lib/vscode/FileSystemAdapter.js"
import TextSearchAdapter from "@/lib/vscode/TextSearchAdapter.js"
import CommandsAdapter from "@/lib/vscode/CommandsAdapter.js"
import TestAdapter from "@/lib/vscode/TestAdapter.js"

export default class ProviderBridge {
    #port;
    #activeRequests = new Map(); // <requestId, AbortController>

    // The Registry
    #registry = new Map(); // Map<authority, Synth>
    #roots = []; // Array<{ authority, name, uri }> sent to client
    #listeners = new Map(); // Map<Synth, Function>

    #fsAdapter;
    #searchAdapter;
    #commandsAdapter;
    #testAdapter;

    constructor(rootSynth, port) {
        this.#port = port;
        this.#fsAdapter = FileSystemAdapter;
        this.#searchAdapter = TextSearchAdapter;
        this.#commandsAdapter = CommandsAdapter;
        this.#testAdapter = TestAdapter;

        // Initialize: Scan the fleet of Synths
        this.#scanFleet(rootSynth);

        this.#port.onmessage = this.#handleMessage.bind(this);
    }

    /**
     * Recursively finds all synth instances and registers them.
     * Ensures each Synth instance is only mounted once (Deduplication).
     */
    #scanFleet(rootSynth) {
        const seenInstances = new Set();

        for (const { path, synth } of rootSynth.walk()) {
            if (seenInstances.has(synth)) {
                continue;
            }
            seenInstances.add(synth);

            let authority;
            let name;

            if (!path || path.length === 0) {
                authority = 'root';
                name = '/';
            } else {
                // Name: "do/get/json/evaluation // do/get/javascript"
                name = path.join(' // ');

                // Authority: "do-get-json-evaluation--do-get-javascript"
                authority = path.map(segment => {
                    // Handle internal slashes within a segment first
                    return segment.split('/')
                        .filter(s => s.length > 0)
                        .map(s => s.replace(/[^a-zA-Z0-9-]/g, '')) // Sanitize chars
                        .join('-');
                }).join('--'); // Join the main path steps with double dash
            }

            this.#register(authority, name, synth);
        }
    }

    #register(authority, name, synth) {
        if (this.#registry.has(authority)) return;

        this.#registry.set(authority, synth);

        // Store metadata for the client to mount
        this.#roots.push({
            authority,
            name,
            path: '/'
        });

        // Attach listeners that tag outgoing events with the specific authority
        const listener = (event) => this.#handleEvent(authority, event);
        this.#listeners.set(synth, listener);

        synth.addEventListener('write', listener);
        synth.addEventListener('restore', listener);
    }

    /**
     * Resolves a URI (string or object) to a Synth instance and a relative path.
     */
    #resolve(uriInput) {
        if (!uriInput) return { synth: null, path: null, authority: null };

        let authority = 'root';
        let path = '/';

        try {
            // Handle standard URL string or VS Code URI object structure
            let hostname, pathname;

            if (typeof uriInput === 'string') {
                const url = new URL(uriInput);
                hostname = url.hostname;
                pathname = url.pathname;
            } else {
                hostname = uriInput.authority;
                pathname = uriInput.path;
            }

            if (hostname) authority = hostname;
            if (pathname) path = decodeURIComponent(pathname);

        } catch (e) {
            console.warn("Bridge: Failed to parse URI", uriInput);
            return { synth: null, path: null, authority: null };
        }

        const synth = this.#registry.get(authority);
        return { synth, path, authority };
    }

    async #handleMessage(event) {
        const message = event.data;
        const { requestId, uri } = message;

        // --- BOOTSTRAP ROUTE ---
        if (message.type === 'getRoots') {
            this.#port.postMessage({
                type: 'response',
                requestId,
                data: { roots: this.#roots }
            });
            return;
        }

        // --- COMMAND ROUTING (Dynamic) ---
        // Commands receive a Resolver function, not a specific synth.
        // This allows them to handle arguments spanning multiple authorities.
        if (message.type === 'runCommand') {
            this.#runRequest(requestId, async () => {
                // Pass the bound resolve method to the command adapter
                return await this.#commandsAdapter.doCommand(this.#resolve.bind(this), message);
            });
            return;
        }

        // --- STANDARD ADAPTER ROUTING (Single Instance) ---
        // For FS, Search, and Test, we resolve the target synth immediately.
        const { synth, path } = this.#resolve(uri);

        if (!synth) {
            this.#replyError(requestId, `Synth authority not found for URI: ${uri}`);
            return;
        }

        // Delegate to adapters, injecting the specific synth instance
        switch (message.type) {
            // --- FS Read ---
            case 'getState':
                this.#runRequest(requestId, async () => ({ state: await this.#fsAdapter.doGetState(synth) }));
                break;
            case 'readFile':
                this.#runRequest(requestId, async () => ({ content: await this.#fsAdapter.doReadFile(synth, path) }));
                break;
            case 'readDirectory':
                this.#runRequest(requestId, async () => ({ entries: await this.#fsAdapter.doReadDirectory(synth, path) }));
                break;

            // --- FS Write ---
            case 'writeFile':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doWriteFile(synth, path, message.content, message.typeHint, message.options));
                break;
            case 'createDirectory':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doCreateDirectory(synth, path));
                break;
            case 'delete':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doDelete(synth, path, message.options));
                break;
            case 'rename':
                this.#runRequest(requestId, async () => {
                    const oldResolved = this.#resolve(message.oldUri);
                    const newResolved = this.#resolve(message.newUri);

                    if (oldResolved.authority !== newResolved.authority) {
                        throw new Error("Cross-root rename not supported.");
                    }
                    await this.#fsAdapter.doRename(synth, oldResolved.path, newResolved.path, message.options);
                });
                break;

            // --- Search ---
            case 'provideTextSearchResults':
                this.#runRequest(requestId, async (onProgress, signal) => {
                    // We need the authority string so the adapter can construct result URIs
                    const { authority } = this.#resolve(uri);
                    await this.#searchAdapter.doTextSearch(synth, authority, message.query, message.options, onProgress, signal);
                    return { status: 'complete' };
                });
                break;

            // --- Test ---
            case 'discoverTests':
                this.#runRequest(requestId, async () => ({ tests: await this.#testAdapter.doDiscover(synth) }));
                break;
            case 'runTests':
                this.#runRequest(requestId, async (onProgress, signal) => {
                    await this.#testAdapter.doRun(synth, message.testIds, onProgress, signal);
                    return { status: 'complete' };
                });
                break;

            // --- Lifecycle ---
            case 'cancel':
                const controller = this.#activeRequests.get(requestId);
                if (controller) {
                    controller.abort();
                    this.#activeRequests.delete(requestId);
                }
                break;
            default:
                console.warn(`Bridge: Unknown message type '${message.type}'`);
        }
    }

    async #runRequest(requestId, actionFn) {
        const controller = new AbortController();
        this.#activeRequests.set(requestId, controller);
        const onProgress = (payload) => this.#port.postMessage({ type: 'progress', requestId, payload });

        try {
            const resultData = await actionFn(onProgress, controller.signal);
            this.#port.postMessage({ type: 'response', requestId, data: resultData });
        } catch (e) {
            if (e.name !== 'AbortError') this.#replyError(requestId, e.message);
        } finally {
            this.#activeRequests.delete(requestId);
        }
    }

    #replyError(requestId, error) {
        this.#port.postMessage({ type: 'response', requestId, error });
    }

    #handleEvent(authority, event) {
        // We act as if we are the specific synth to get the translation
        const data = this.#fsAdapter.translateEvent(event, this.#registry.get(authority));

        // Tag the event with authority so Client knows which Tree in the Forest to update
        if (data.type === 'restore') {
            this.#port.postMessage({ type: 'restore', authority });
        } else if (data.type === 'write') {
            this.#port.postMessage({ type: 'write', authority, data: data.data });
        }
    }

    dispose() {
        for (const [synth, listener] of this.#listeners) {
            synth.removeEventListener('write', listener);
            synth.removeEventListener('restore', listener);
        }
        this.#listeners.clear();
        this.#port.close();
        this.#activeRequests.forEach(c => c.abort());
    }
}
