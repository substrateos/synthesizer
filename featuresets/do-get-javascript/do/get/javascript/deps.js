export const attributes = {
    do: {get: 'do/get/javascript'}
}

import findFreeVariables from '@/lib/javascript/findFreeVariables.js'
import findImports from '@/lib/javascript/findImports.js'

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute} = handlerInputs ?? {}

    const { ast, hasModuleSyntax } = await workspace.getAttribute({ unit, name, attribute: 'ast' })

    if (!hasModuleSyntax) {
        return findFreeVariables({ast})
    }

    const imports = findImports({ast})
    const importSources = imports.map(({source, specifiers}) => ({source, specifiers}))

    const workspacePrefix = '@/'
    const deps = []
    for (const {source: importSource, specifiers} of importSources) {
        let dep = importSource
        if (!dep.startsWith(workspacePrefix)) {
            continue
        }

        dep = dep.slice(workspacePrefix.length)
        if (dep.endsWith('.js')) {
            dep = dep.slice(0, -3)
        }
        deps.push([importSource, dep, specifiers.map(({type, importedName}) => ({type, importedName}))])
    }

    return deps
}
