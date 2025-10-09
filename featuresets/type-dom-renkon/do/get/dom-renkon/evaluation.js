import parse from "@/lib/dom-renkon/parse"
import findDefaultExports from "@/lib/dom-renkon/findDefaultExports"
import { ProgramState } from "@/lib/dom-renkon/renkon-core@0.10.3/renkon-core"
import { h, render, Component, html } from "@/lib/dom-renkon/htm@3.1.1/preact"
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

    let genimportCount = 0
    const genimport = () => `_$$genimport$${genimportCount++}`

    // todo support depmap and full imports

    const importScripts = new Set()

    const {ast} = parse({source})
    const imports = new Map()
    const addImport = (importSource, specifiers) => {
        let receivers = imports.get(importSource)
        if (!receivers) {
            receivers = []
            imports.set(importSource, receivers)
        }

        let importReceiverName
        for (const {type, localName, importedName} of specifiers) {
            // {type: default, localName}
            // {type: named, localName, importedName}
            // {type: namespace, localName}
            switch (type) {
            case 'default':
                importScripts.add(`const ${localName} = Behaviors.receiver();`)
                receivers.push(value => ps.registerEvent(localName, getDefaultIfModule(value)))
                break
            case 'named':
                if (!importReceiverName) {
                    importReceiverName = genimport()
                }
                importScripts.add(`const ${localName} = ${importReceiverName}.${importedName ?? localName};`)
                break
            default:
                throw new Error("only default and named imports are supported at the moment")
            }
        }

        if (importReceiverName) {
            importScripts.add(`const ${importReceiverName} = Behaviors.receiver();`)
            receivers.push(value => ps.registerEvent(importReceiverName, value))
        }
    }
    const refreshReceiversNamed = async (names) => {
        const resolveImport = name => {
            if (name === "@workspace") { return workspace }
            return workspace.has(name) ? workspace.get(name) : undefined
        }
        const values = await Promise.all(names.map(name => resolveImport(name)))
        names.forEach((name, i) => {
            const value = values[i]
            const receivers = imports.get(name)
            if (receivers) {
                for (const fn of receivers) { fn(value) }
            }
        })
    }

    const spanReplacements = []

    const foundImports = findImports({ast})
    for (let {source: importSource, span, dynamic, specifiers} of foundImports) {
        if (dynamic) { continue }
        if (!importSource.startsWith("@")) { continue }
        if (importSource.startsWith("@/")) {
            importSource = importSource.slice(2)
        }
        addImport(importSource, specifiers)
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
    containerNode.imports = new Set(imports.keys())
    containerNode.resampleImports = (names=[...imports.keys()]) => refreshReceiversNamed(names)

    const renderScript = `((component, {render, containerNode}) => {
        render(component, containerNode);
    })(${defaultExportName}, Renkon.app);`

    const scripts = [
        ...importScripts,
        source,
        renderScript,
    ]
    ps.setupProgram(scripts)
    
    return containerNode
}
