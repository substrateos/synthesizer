export default async function() {
    const {unit: {source}, workspace} = this
    const stepPromptsUnit = await workspace.call({type: 'prompt/markdown', source:
`Transform the following list into a json array, with each number its own element in the array but the element number itself removed. Output a json codefence, no javascript.

${source}`})

    const stepPrompts = await workspace.call(stepPromptsUnit)

    const steps = stepPrompts.map(source => ({source, type: 'message/user'}))
    console.log({steps})
    return await workspace.eval({type: "plan/json", source: JSON.stringify({steps})})
}
