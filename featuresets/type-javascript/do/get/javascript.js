export const attributes = {
    do: {get: 'do/get/javascript'}
}

import prepareDynamicImports from "@/lib/javascript/prepareDynamicImports.js"
import insertReturn from "@/lib/javascript/insertReturn.js"
import getJavascriptAST from "@/do/get/javascript/ast"
import getJavascriptDeps from "@/do/get/javascript/deps"
import getJavascriptDepmap from "@/do/get/javascript/depmap"
import getJavascriptDocs from "@/do/get/javascript/docs"

const origConsoleLog = console.log

const workspaceImplModuleName = "@workspace"
const workspaceImplModuleSource = `
let workspace
export const setWorkspace = (w) => {
    if (workspace) { throw new Error("workspace already set") }
    workspace = w
}
export const getWorkspace = () => workspace`

async function runJavaScriptModule({name, source, workspace, ast, deps, depmap}) {
    const cleanups = []

    const createBlobURL = (key, blobParts, type) => {
        const blob = new Blob(blobParts, {type})
        const url = URL.createObjectURL(blob);
        cleanups.push(() => URL.revokeObjectURL(url))
        return url
    };

    const workspaceImplModuleURL = createBlobURL(`${name}/workspace`, [workspaceImplModuleSource], 'text/javascript')
    const { setWorkspace } = await import(workspaceImplModuleURL)
    setWorkspace(workspace)

    const depModules = deps.map(([importName, specifiers]) => {
        const importsDefault = specifiers.some(({type}) => type === 'default')
        const importsNamespace = specifiers.some(({type}) => type === 'namespace')
        let maybeExportDefault = importsDefault ? `export default (dep?.[Symbol.toStringTag] === 'Module') ? dep.default : dep` : ''

        const importNames = new Set(specifiers.flatMap(({type, importedName}) => type === 'named' ? [importedName] : []))
        let maybeExportNames = ''
        if (importNames.size) {
            maybeExportNames = Array.from(importNames, name => `export const ${name} = dep.${name};`).join("\n")
        }

        // if (importsNamespace) {
        //     // this is a hack and we really should be parsing the exports of the source module to generate maybeExportNames
        //     maybeExportDefault = `export {...dep}`
        // }

        const depName = depmap[importName]
        if (!depName) {
            return
        }

        return [importName, `
const {getWorkspace} = await import("${workspaceImplModuleURL}")
const dep = await getWorkspace().get(${JSON.stringify(depName)})
${maybeExportDefault}
${maybeExportNames}
    `]
    }).filter(_ => _)

    // add the magic trailing sourceURL comment so we can make sense of it in dev tools
    source = source + `\n//# sourceURL=${name}`
    
    const {
        entryURL,
        importMap,
    } = prepareDynamicImports({
        createBlobURL,
        entrySource: source,
        importSources: Object.fromEntries(depModules),
        scopedImports: {
            [workspaceImplModuleName]: workspaceImplModuleURL,
        }
    })

    // add import map to document
    const importmapScript = document.createElement('script');
    importmapScript.type = 'importmap';
    importmapScript.textContent = JSON.stringify(importMap, null, 2);
    document.head.prepend(importmapScript)
    cleanups.push(() => importmapScript.remove())

    try {
        const module = await import(entryURL)
        return module
    } catch (err) {
        throw err
    } finally {
        // clean up once we're done
        cleanups.forEach(f => f())
    }
}

// we should use a sandbox instead, for multiple reasons:
// - this hack can break our own console.log
// - this can get stuck in an infinite loop
// - the source or test can interfere with our own execution
async function runJavascriptScriptWithDepValues({name, source, log, depValues}) {
    const renderedSource = [
        `return (async () => {`,
        'arguments[0] && (console.log = arguments[0]);',
        ...Object.keys(depValues).map(name => `const ${name} = arguments[1].${name};`),
        source,
        `})();`,
        `//# sourceURL=${name}`,
    ].join("\n")
    
    try {
        const fn = new Function(renderedSource)
        return await fn.call(null, log, depValues)
    } finally {
        console.log = origConsoleLog
    }
}

async function runJavascript(handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute} = handlerInputs ?? {}
    let {source} = unit
    if (typeof source !== 'string') {
        origConsoleLog({source})
        const err = new Error(`source must be a string`)
        err.source = source
        throw err
    }

    let deps = []
    try {
      deps = await workspace.getAttribute({unit, name, attribute: 'deps'})
    } catch (e) {
      console.warn('could not parse deps variables in source', e, {source})
    }

    let depmap = {}
    try {
      depmap = await workspace.getAttribute({unit, name, attribute: 'depmap'})
    } catch (e) {
      console.warn('could not get depmap from source', e, {source})
    }

    let ast, hasModuleSyntax
    try {
      ({ast, hasModuleSyntax} = await workspace.getAttribute({unit, name, attribute: 'ast'}))
    } catch (err) {
      console.warn('could not parse ast from source', e, {source})
    }

    if (hasModuleSyntax) {
        return await runJavaScriptModule({name, source, workspace, deps, depmap, ast})
    }

    return await runJavascriptScript({name, source, workspace, deps, depmap, ast})
}

async function runJavascriptScript({name, source, workspace, deps, depmap, ast}) {

    // rewrite the source to return the value of expression if necessary
    source = insertReturn({source, ast})

    const getAll = async (names, options) => {
        return Object.fromEntries(await Promise.all(
            Array.from(names, async name => [name, (await workspace.get(name, options))])))
    }

    let depNames = deps.map(dep => depmap[dep])
    let depValues = {}
    try {
        const undefinedDeps = depNames.filter(v => !workspace.has(v))
        if (undefinedDeps.length) {
            throw new Error(`workspace does not have definitions for unbound variables in source: ${undefinedDeps.join(", ")}`)
        }
        depValues = await getAll(depNames)
    } catch (e) {
        console.warn('could not parse free variables in source', e, {source})
    }
        
    return await runJavascriptScriptWithDepValues({name, source, log: workspace.log, depValues})
}

const getDefaultUnlessTypeof = (o, t) => {
    if (o &&
        typeof o !== t &&
        o[Symbol.toStringTag] === 'Module' &&
        o.default) {
        o = o.default
    }

    return o
}

export default async function(handlerInputs) {
    const {action, unit, name, workspace} = this
    if (action !== 'get') {
        return undefined
    }

    const {attribute} = handlerInputs ?? {}

    switch (attribute) {
    case 'evaluation':
        return await runJavascript.call(this, handlerInputs)
    case 'ast':
        return await getJavascriptAST.call(this, handlerInputs)
    case 'docs':
        return await getJavascriptDocs.call(this, handlerInputs)
    case 'deps':
        return await getJavascriptDeps.call(this, handlerInputs)
    case 'depmap':
        return await getJavascriptDepmap.call(this, handlerInputs)
    }

    const actionHandlerName = `do/get/javascript/${attribute}`
    if (workspace.has(actionHandlerName)) {
        let actionHandler = await workspace.get(actionHandlerName)
        actionHandler = getDefaultUnlessTypeof(actionHandler, 'function')
        return await actionHandler.call(this, handlerInputs)
    }

    return undefined
}
