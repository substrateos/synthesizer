export const attributes = {
    do: {get: 'do/get/javascript'}
}

import findFreeVariables from "@/lib/javascript/findFreeVariables.js"
import findImports from "@/lib/javascript/findImports.js"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute} = handlerInputs ?? {}

    const { ast, hasModuleSyntax } = await workspace.getAttribute({ unit, name, attribute: 'ast' })

    const depmap = {}

    if (!hasModuleSyntax) {
        // todo free variables are basically globals...?
        for (const freeVariable of findFreeVariables({ast})) {
            depmap[freeVariable] = `globals/${freeVariable}`
        }
        return depmap
    }

    const imports = findImports({ast})

    const workspacePrefix = '@/'
    for (const {source: importSource} of imports) {
        let dep = importSource
        if (!dep.startsWith(workspacePrefix)) {
            continue
        }

        dep = dep.slice(workspacePrefix.length)
        depmap[importSource] = dep
    }

    return depmap
}
