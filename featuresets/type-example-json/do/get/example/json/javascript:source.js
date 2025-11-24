export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    return unit.source
}
