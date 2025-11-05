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
        return findFreeVariables({ast}).map((dep) => [dep, dep])
    }

    const imports = findImports({ast})
    const importSources = imports.map(({source, specifiers}) => ({source, specifiers}))

    const deps = []
    for (const {source: importSource, specifiers} of importSources) {
        deps.push([importSource, specifiers.map(({type, importedName}) => ({type, importedName}))])
    }

    return deps
}
