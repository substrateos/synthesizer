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


export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute} = handlerInputs ?? {}

    let type = unit?.type
    let getter

    if (unit?.debug) {
        debugger
    }

    let getterName = `do/get/${type}`
    if (workspace.has(getterName)) {
        getter = await workspace.get(getterName)
    }
    if (!getter) {
        if (attribute) {
            getterName = `do/get/${type}/${attribute}`
            if (workspace.has(getterName)) {
                getter = await workspace.get(getterName)
            }
        }
    }
    if (!getter) {
        getterName = `do/get/default/${attribute}`
        if (workspace.has(getterName)) {
            getter = await workspace.get(getterName)
        }
    }
    if (!getter) {
        getterName = `do/get/default`
        if (workspace.has(getterName)) {
            getter = await workspace.get(getterName)
        }
    }
    if (!getter) {
        return undefined
    }

    getter = getDefaultUnlessTypeof(getter, 'function')

    return await getter.call(this, handlerInputs)
}
