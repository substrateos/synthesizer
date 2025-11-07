import ProviderBridge from "@/lib/vscode/ProviderBridge";

function trapInit(iframe, cb) {
    if (iframe?.contentWindow?.document?.readyState === 'complete') {
        cb(iframe);
    } else {
        iframe.onload = () => cb(iframe);
    }
}

export default async function (workspace) {
    const iframe = document.createElement('iframe')
    iframe.src = "./featuresets/vscode/lib/vscode/vscode.html"
    iframe.style = 'border: 0; position: absolute; inset: 0; width: 100%; height: 100%'

    trapInit(iframe, (iframe) => {
        // An alternative to the attach/dispose protocol here is connectCallback and
        // disconnectedCallback that is part of the webcomponent specification.

        const ch = new MessageChannel();
        const bridge = new ProviderBridge(workspace, ch.port1)
        iframe.contentWindow.postMessage({ type: 'init-port' }, '*', [ch.port2]);

        // Use pagehide with !!persisted to signal that the iframe is unloading and we should clean up.
        iframe.contentWindow.addEventListener("pagehide", event => {
            if (event.persisted) {
                return;
            }

            // iframe is being removed from the DOM, so clean up the bridge in the parent DOM.
            bridge.dispose()
        });
    })

    return iframe;
}

