export default async function runJSON() {
    const {unit: {source}, workspace} = this
    return JSON.parse(source)
}
