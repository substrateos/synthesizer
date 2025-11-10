export default async function (synth, target, list) {
    const paths = list.map(uri => {
        const path = uri.path.slice(1) // trim the leading /

        // if it exists, assume it's a unit
        if (synth.has(path)) {
            return [path]
        }

        // otherwise assume it's a directory. since those are virtual, turn it into a RegExp.
        const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        return [new RegExp(`^${escaped}\/`)]
    })

    const markerFiles = ["AGENTS.md", "README.md"]
    const dump = await synth.do.dump({paths, markerFiles})

    return {
        function: ((dump) => async (vscode) => {
            const doc = await vscode.workspace.openTextDocument({
                content: dump,
                language: 'markdown',
            })

            await vscode.window.showTextDocument(doc)
        }).toString(),
        params: [dump],
    }
}
