// example usage
// await synth.do.dump({paths: [['do/get/javascript', 'lib/javascript/integration/modules'], ['do/get/javascript', 'lib/javascript/integration/modules/tests/exports']]})

const getDependencies = async (name, {getShallowDependencies, transitive=true}={}, dependencies={}) => {
    if (name in dependencies) {
        return
    }
    const mine = await getShallowDependencies(name) || []
    console.log({mine})
    dependencies[name] = mine
    if (transitive) {
        for (const a of mine) {
            await getDependencies(a, {getShallowDependencies, transitive}, dependencies)
        }
    }
    return dependencies
}

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {paths=[]} = handlerInputs ?? {}

    const units = {}
    for (const path of paths) {
        let synth = path.slice(0, -1).reduce((acc, name) => acc.read(name).synth, workspace)
        let n = path[path.length - 1]

        const deps = await getDependencies(n, {
            getShallowDependencies: async name => {
                const deps = await synth.getAttribute({name, attribute: 'deps'}) || []
                const depmap = await synth.getAttribute({name, attribute: 'depmap'}) || {}
                const actualDeps = deps.map(dep => depmap[dep])

                // include an explicity importmap if necessary.
                if (JSON.stringify(deps) != JSON.stringify(actualDeps)) {
                    units[`importmap[${name}]`] = {type: "json", source: JSON.stringify(depmap)}
                }
                return actualDeps
            },
        })

        for (const dep of Object.keys(deps)) {
            units[dep] = synth.read(dep)
        }
    }

    const lines = []

    // leave out versioned dependencies for now. they are large and likely won't add much.
    // in the future we might want to use tree shaking to include just enough of them, or allow some way to search/resolve them interactively as a "tool"
    const skipNamePattern = /@/
    for (const [name, {type, source}] of Object.entries(units)) {
        if (skipNamePattern.test(name)) {
            continue
        }
        lines.push(`###### ${name}`)
        lines.push('``` ' + type)
        lines.push(source)
        lines.push('```')
        lines.push('')
    }

    return lines.join("\n")
}
