import getDefault from "@/do/get/default"

export default async function(handlerInputs) {
    const {action, unit, name, workspace} = this
    if (action !== 'get') {
        return undefined
    }

    const {attribute} = handlerInputs ?? {}

    switch (attribute) {
    case 'javascript:source':
        return unit.source
    case 'evaluation':
    case 'javascript:evaluation':
        return await getDefault.call(this, {name, unit, attribute: 'javascript:evaluation'})
    case 'ast':
    case 'javascript:ast':
        return await getDefault.call(this, {name, unit, attribute: 'javascript:ast'})
    case 'docs':
    case 'javascript:docs':
        return await getDefault.call(this, {name, unit, attribute: 'javascript:docs'})
    case 'deps':
    case 'javascript:deps':
        return await getDefault.call(this, {name, unit, attribute: 'javascript:deps'})
    case 'depmap':
    case 'javascript:depmap':
        return await getDefault.call(this, {name, unit, attribute: 'javascript:depmap'})
    }

    const actionHandlerName = `do/get/javascript/${attribute}`
    if (workspace.has(actionHandlerName)) {
        let actionHandler = await workspace.get(actionHandlerName)
        actionHandler = getDefaultUnlessTypeof(actionHandler, 'function')
        return await actionHandler.call(this, handlerInputs)
    }

    return undefined
}
