export const attributes = {
    do: {get: 'do/get/javascript'}
}

import parse from "@/lib/javascript/parse.js"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute} = handlerInputs ?? {}

    const source = await workspace.getAttribute({unit, name, attribute: 'javascript:source'})
    return parse({source})
}
