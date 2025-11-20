# Command Protocol

This directory contains the stateless command handlers invoked by the VS Code extension.

### The Hybrid Execution Model

Commands use a **Split Execution** pattern to bridge the gap between the Host (Server) and VS Code (Client):

1.  **Phase 1 (Server-Side):** The handler runs in the `ProviderBridge`. It has access to the full `Synth` store, adapters, and filesystem.
2.  **Phase 2 (Client-Side):** The handler returns a serialized function string. The VS Code extension receives this string, rehydrates it, and executes it to manipulate the UI (open files, show messages, move cursors).

### Handler Signature

Each file must export a default async function:

```javascript
/**
 * @param {object} context - { resolve, previewAdapter, testAdapter }
 * @param {...any} args - Arguments passed from VS Code (e.g., URIs, inputs)
 */
export default async function (context, ...args) {
    // 1. Server-side logic (e.g., write files, query synth)
    const result = await doSomethingHeavy();

    // 2. Return instructions for the Client
    return {
        // A stringified function that accepts the params below
        // Returns a function signature: (vscode, bridgeClient) => void
        function: ((data) => async (vscode, bridgeClient) => {
            vscode.window.showInformationMessage(data);
        }).toString(),

        // Arguments passed to the outer function above
        params: [result]
    };
}
```

### Context Object

The `context` argument provides access to server-side utilities:

  * **`resolve(uri)`**: Converts a VS Code URI into a `{ synth, path, authority, query }` object.
  * **`onProgress(payload)`**: A callback to stream intermediate data back to the client before the final return.
  * **`signal`**: An AbortSignal that fires if the client cancels the command (e.g., user clicks "Cancel").
