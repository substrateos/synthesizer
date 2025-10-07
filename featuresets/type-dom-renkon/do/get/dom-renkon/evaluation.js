import parse from "@/lib/dom-renkon/parse"
import findDefaultExports from "@/lib/dom-renkon/findDefaultExports"
import { ProgramState } from "@/lib/renkon-core@0.10.3/renkon-core.js"
import { h, render, Component, html } from "@/lib/htm@3.1.1/preact.js"

function maybeDefineCustomElement(customElementName, customElementConstructor) {
    const existing = customElements.get(customElementName)
    if (!existing) {
        customElements.define(customElementName, customElementConstructor)
        return customElementName
    }

    if (customElementConstructor.toString() === existing.toString()) {
        return customElementName
    }
}


function defineCustomElement(baseCustomElementName, customElementConstructor) {
    // do not make more than 1000 attempts
    const maxAttempts = 1000
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const customElementName = `${baseCustomElementName}-${attempt}`
        if (maybeDefineCustomElement(customElementName, customElementConstructor)) {
            return customElementName
        }
    }

    throw new Error(`could not define customElement with base name ${baseCustomElementName} after ${maxAttempts} attempts`)
}

// note that we can't upgrade our custom element definition, so we need to lazily re-use it.
const baseCustomElementName = 'renkon-mounter'
let customElementName = defineCustomElement(baseCustomElementName, class extends HTMLElement {
        connectedCallback() {
            const ps = this.programState
            if (!ps.evaluatorRunning) {
                ps.evaluator(Date.now());
            }
        }
        disconnectedCallback() {
            const ps = this.programState
            if (ps?.evaluatorRunning) {
                window.cancelAnimationFrame(ps.evaluatorRunning)
                ps.evaluatorRunning = 0
            }
        }
    })

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this

    let source = await workspace.getAttribute({unit, name, attribute: 'source'})

    const {ast} = parse({source})
    const defaultExport = findDefaultExports({ast})?.[0]
    const defaultExportName = defaultExport?.name

    if (defaultExport?.span) {
        // this is a hack because renkon doesn't like export default statements
        const p1 = source.slice(0, defaultExport.span.start)
        const p2 = source.slice(defaultExport.span.end)
        source = p1 + p2
    }

    const containerNode = document.createElement(customElementName)
    const ps = new ProgramState(0, {
        containerNode,
        h, render, Component, html,
    })
    containerNode.programState = ps

    const renderSource = `((component) => {
        const {html, render, h, containerNode} = Renkon.app;
        render(component, containerNode);
    })(${defaultExportName});`

    ps.setupProgram([
        source,
        renderSource,
    ])
    
    return containerNode
}
