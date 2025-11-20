export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    return await workspace.getAttribute({unit, name, attribute: 'javascript:evaluation'})
}
