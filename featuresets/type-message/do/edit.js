// let's say this is the action "edit", operates on a specific attribute (by default, "source"):
// - read current attribute
// - prompt model with prompt
// - write response as the new value

export default async function (handlerInputs) {
    const { action, unit, name, workspace } = this
    let { attribute = 'source+type', instructions } = handlerInputs ?? {}

    if (!instructions) {
        throw new Error('must provide instructions for edit')
    }

    let canAutoUpdateType = false
    if (attribute === 'source+type') {
        canAutoUpdateType = true
        attribute = 'source'
    }

    const initial = await workspace.getAttribute({ unit, name, attribute })

    let prompt
    if (!initial?.length) {
        prompt = {
            type: 'prompt/markdown', source:
                `Create a file according to the following instructions. Reply with just a codefence and nothing else.
## Instructions
${instructions}
`}
    } else {
        prompt = {
            type: 'prompt/markdown', source:
                `Update the file according to the given instructions. Reply with just a codefence and nothing else.
## Instructions
${instructions}
## File
\`\`\`${unit?.type}
${initial}
\`\`\`
`}
    }

    const updated = await workspace.call(prompt)
    const updatedUnit = {
        ...unit,
        [attribute]: updated.source,
    }

    if (canAutoUpdateType && updated.type) {
        updatedUnit.type = updated.type
    }

    const units = { [name]: updatedUnit }
    await workspace.write(units)
    return units
}
