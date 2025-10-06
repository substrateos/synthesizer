// to avoid an infinite loop, we must specify our get handler
export const attributes = {
    do: {get: 'do/get/javascript'}
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

export default Object.assign(
    async function (handlerInputs) {
        const {action, unit, name, workspace} = this

        const actionHandlerName = unit?.do?.[action] ?? `do/${action}`
        let actionHandler = await workspace.get(actionHandlerName)
        actionHandler = getDefaultUnlessTypeof(actionHandler, 'function')
        return await actionHandler.call(this, handlerInputs)
    }, {
        // stateless so nothing to do
        save() {},
        restore(checkpoint) { return this },
        clone() { return this },
    })
