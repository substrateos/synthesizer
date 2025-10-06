export default async function (handlerInputs) {
    // the default evaluation is just the source itself
    const {action, unit, name, workspace} = this
    if (unit === undefined) {
        throw new Error(`unknown unit: ${name}`)
    }
    return unit.source
}
