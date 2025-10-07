export default async function() {
    const {unit: {source}, workspace} = this
    const message = {role: 'user', content: [{type: 'text', text: source}]}
    const response = await workspace.call({type: 'message', source: JSON.stringify(message)})
    return response.content[0].text
}
