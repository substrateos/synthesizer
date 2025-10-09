export default async function() {
    const {unit: {source}, workspace} = this
    const result = await workspace.eval({type: 'chat/prompt', source})

    const codefenceMatch = result.match(/\s*```(\S+)\n([\s\S]+)\n```\s*/);
    if (codefenceMatch) {
        return {
            source: codefenceMatch[2],
            type: codefenceMatch[1],
        }
    }
    return {
        source: result,
        type: 'text',
    }
}
