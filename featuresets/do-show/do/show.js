export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const elt = await workspace.getAttribute({name, unit, attribute: 'domElement'})
    document.body.appendChild(elt)
    return elt
}
