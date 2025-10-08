import parse from "@/lib/dom-renkon/parse"
import findDefaultExports from "@/lib/dom-renkon/findDefaultExports"
import { ProgramState } from "@/lib/dom-renkon/renkon-core@0.10.3/renkon-core.js"
import { h, render, Component, html } from "@/lib/dom-renkon/htm@3.1.1/preact.js"
import replaceSpans from "@/lib/dom-renkon/replaceSpans"
import findImports from "@/lib/dom-renkon/findImports"
import containerElement from "@/lib/dom-renkon/containerElement"
import defineCustomElement from "@/lib/dom-renkon/defineCustomElement"

// note that we can't upgrade our custom element definition, so we need to lazily re-use it.
const baseCustomElementName = 'renkon-mounter'
let customElementName = defineCustomElement(baseCustomElementName, containerElement)

function getDefaultIfModule(unit) {
    if (unit && unit[Symbol.toStringTag] === 'Module' && unit.default) {
        unit = unit.default
    }
    return unit
}

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this

    const containerNode = document.createElement(customElementName)
    const ps = new ProgramState(0, {
        containerNode,
        h, render, Component, html,
    })

    let source = await workspace.getAttribute({unit, name, attribute: 'source'})

    // todo support depmap and full imports

    const {ast} = parse({source})
    const importReceivers = new Map()
    const importReceiverLocalNames = new Set()
    const addImport = (importSource, specifiers) => {
        let receivers = importReceivers.get(importSource)
        if (!receivers) {
            receivers = []
            importReceivers.set(importSource, receivers)
        }
        for (const {type, localName} of specifiers) {
             // {type: default, localName}
             // {type: named, localName, importedName}
             // {type: namespace, localName}
            if (type !== 'default') {
                throw new Error("only default imports are supported at the moment")
            }
            importReceiverLocalNames.add(localName)
        }

        receivers.push(value => {
            for (const {type, localName} of specifiers) {
                switch (type) {
                case 'default':
                    value = getDefaultIfModule(value)
                    break
                }
                ps.registerEvent(localName, value)
            }
        })
    }
    const refreshReceiversNamed = async (names) => {
        const values = await Promise.all(names.map(name => workspace.has(name) ? workspace.get(name) : undefined))

        names.forEach((name, i) => {
            const value = values[i]
            const receivers = importReceivers.get(name)
            for (const fn of receivers) { fn(value) }
        })
    }

    const spanReplacements = []

    const imports = findImports({ast})
    for (let {source: importSource, span, dynamic, specifiers} of imports) {
        if (dynamic) { continue }
        if (!importSource.startsWith("@/")) { continue }
        addImport(importSource.slice(2), specifiers)
        spanReplacements.push({...span, replacement: `// ${source.slice(span.start, span.end)}`})
    }

    const defaultExport = findDefaultExports({ast})?.[0]
    const defaultExportName = defaultExport?.name

    if (defaultExport?.span) {
        // this is a hack because renkon doesn't like export default statements
        spanReplacements.push({...defaultExport.span, replacement: `// ${source.slice(defaultExport.span.start, defaultExport.span.end)}`})
    }

    source = replaceSpans(source, spanReplacements)

    ps.evaluate(0)

    containerNode.programState = ps
    containerNode.workspace = workspace
    containerNode.importReceivers = importReceivers
    containerNode.refreshReceiversNamed = refreshReceiversNamed

    const renderScript = `((component) => {
        const {html, render, h, containerNode} = Renkon.app;
        render(component, containerNode);
    })(${defaultExportName});`

    const importReceiverScripts = Array.from(importReceiverLocalNames, name => `const ${name} = Behaviors.receiver();`)

    const scripts = [
        ...importReceiverScripts,
        source,
        renderScript,
    ]
    ps.setupProgram(scripts)
    
    return containerNode
}
