export default async function() {
    const {unit: {source}, workspace} = this
    return JSON.parse(source)
}
