export default async function() {
    const {unit: {source: content}, workspace} = this
    const task = JSON.parse(content)
    return task
}
