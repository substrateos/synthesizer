import doDump from "@/do/dump"

/**
 * @param {Function} resolve Function to resolve URIs to Synth instances
 * @param {object} target The target URI where the command was invoked (fallback if list is empty)
 * @param {Array} list List of selected URIs (from multi-select)
 */
export default async function (resolve, target, list) {
    // If no list provided (e.g. command palette), use target as a single-item list
    const items = (list && list.length > 0) ? list : [target];
    
    // 1. Group paths by Synth instance
    // Map<Synth, Array<[path] | [RegExp]>>
    const groups = new Map();

    for (const uri of items) {
        if (!uri) continue;

        const { synth, path: rawPath } = resolve(uri);
        
        if (!synth || !rawPath) continue;

        if (!groups.has(synth)) {
            groups.set(synth, []);
        }

        // Strip leading slash for internal synth path logic
        const path = rawPath.slice(1);

        // Determine if it's a Unit (exact match) or a Directory (RegExp match)
        if (synth.has(path)) {
            groups.get(synth).push([path]);
        } else {
            // Assume it's a virtual directory -> Dump everything under it
            const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            groups.get(synth).push([new RegExp(`^${escaped}\/`)]);
        }
    }

    // 2. Execute dumps in parallel for each synth
    const markerFiles = ["AGENTS.md", "README.md"];
    const dumpPromises = [];

    for (const [synth, paths] of groups) {
        // synth.do.dump returns a Promise<string>
        dumpPromises.push(doDump.call({ workspace: synth }, { paths, markerFiles }));
    }

    const results = await Promise.all(dumpPromises);

    // 3. Concatenate results
    const fullDump = results.join('\n\n');

    return {
        function: ((dump) => async (vscode) => {
            const doc = await vscode.workspace.openTextDocument({
                content: dump,
                language: 'markdown',
            });

            await vscode.window.showTextDocument(doc);
        }).toString(),
        params: [fullDump],
    };
}
