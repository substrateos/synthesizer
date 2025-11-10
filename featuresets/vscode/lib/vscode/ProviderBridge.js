import FileSystemAdapter from '@/lib/vscode/FileSystemAdapter'
import TextSearchAdapter from '@/lib/vscode/TextSearchAdapter'
import CommandsAdapter from '@/lib/vscode/CommandsAdapter'

export default class ProviderBridge {
    #synth;
    #port;
    #listener;

    #fsAdapter;
    #searchAdapter;
    #commandsAdapter;

    #activeRequests = new Map(); // <requestId, AbortController>

    constructor(synth, port) {
        this.#synth = synth;
        this.#port = port;
        this.#fsAdapter = FileSystemAdapter;
        this.#searchAdapter = TextSearchAdapter;
        this.#commandsAdapter = CommandsAdapter;

        this.#listener = this.#handleEvent.bind(this)
        synth.addEventListener('write', this.#listener)
        synth.addEventListener('restore', this.#listener)

        this.#port.onmessage = this.#handleMessage.bind(this);
    }

    async #handleMessage(event) {
        const message = event.data;
        const { requestId } = message;

        switch (message.type) {
            // --- FS Adapter Routes (Read) ---
            case 'getState':
                this.#runRequest(requestId, async () => {
                    const state = await this.#fsAdapter.doGetState(this.#synth);
                    return { state }; // Action returns the final data payload
                });
                break;
            case 'readFile':
                this.#runRequest(requestId, async () => {
                    const content = await this.#fsAdapter.doReadFile(this.#synth, message.path);
                    return { content }; // Action returns the final data payload
                });
                break;
            case 'readDirectory':
                this.#runRequest(requestId, async () => {
                    const entries = await this.#fsAdapter.doReadDirectory(this.#synth, message.path);
                    return { entries };
                });
                break;

            // --- FS Adapter Routes (Write) ---
            case 'writeFile':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doWriteFile(this.#synth, message.path, message.content, message.typeHint, message.options));
                break;
            case 'createDirectory':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doCreateDirectory(this.#synth, message.path));
                break;
            case 'delete':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doDelete(this.#synth, message.path, message.options));
                break;
            case 'rename':
                this.#runRequest(requestId, async () => await this.#fsAdapter.doRename(this.#synth, message.oldPath, message.newPath, message.options));
                break;

            // --- Search Handler Route ---
            case 'provideTextSearchResults':
                this.#runRequest(requestId, async (onProgress, signal) => {
                    await this.#searchAdapter.doTextSearch(
                        this.#synth,
                        message.query,
                        message.options,
                        onProgress,
                        signal
                    );
                    return { status: 'complete' };
                });
                break;

            // --- Command Route ---
            case 'runCommand':
                this.#runRequest(requestId, async () => await this.#commandsAdapter.doCommand(this.#synth, message));
                break;

            // --- Generic Lifecycle Route ---
            case 'cancel': {
                const controller = this.#activeRequests.get(requestId);
                if (controller) {
                    controller.abort();
                    this.#activeRequests.delete(requestId);
                }
                break;
            }

            default:
                console.warn(`SynthBridge: Received unknown message type '${message.type}'`);
        }
    }

    /**
     * --- Unified Request Helper ---
     * Runs any action, handling streaming progress, cancellation, and response.
     * @param {number} requestId The ID for this request.
     * @param {function(onProgress, abortSignal)} actionFn The function to execute.
     */
    async #runRequest(requestId, actionFn) {
        const controller = new AbortController();
        this.#activeRequests.set(requestId, controller);

        const onProgress = (payload) => {
            this.#port.postMessage({
                type: 'progress',
                requestId,
                payload
            });
        };

        try {
            const resultData = await actionFn(onProgress, controller.signal);
            this.#port.postMessage({
                type: 'response',
                requestId,
                data: resultData
            });
        } catch (e) {
            if (e.name !== 'AbortError') {
                this.#port.postMessage({ type: 'response', requestId, error: e.message });
            }
        } finally {
            this.#activeRequests.delete(requestId);
        }
    }

    #handleEvent(event) {
        const data = this.#fsAdapter.translateEvent(event, this.#synth);

        if (data.type === 'restore') {
            this.#port.postMessage({ type: 'restore' });
        } else if (data.type === 'write') {
            this.#port.postMessage({ type: 'write', data: data.data });
        }
    }

    dispose() {
        this.#synth.removeEventListener('write', this.#listener)
        this.#synth.removeEventListener('restore', this.#listener)
        this.#port.close();
        this.#activeRequests.forEach(controller => controller.abort());
    }
}
