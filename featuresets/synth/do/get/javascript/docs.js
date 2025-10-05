export const attributes = {
    do: {get: 'do/get/javascript'}
}

import findDocs from "@workspace/lib/javascript/findDocs.js"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const { ast, comments } = await workspace.getAttribute({ unit, name, attribute: 'ast' })

    return findDocs({ast, comments})
}
