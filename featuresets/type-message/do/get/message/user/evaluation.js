export default async function () {
    const {unit: {source}, workspace} = this
    const textMessage = (role, text) => ({role, content: [{type: 'text', text}]})
    return await workspace.eval({type: "message", source: JSON.stringify(textMessage("user", source))})
}
