// example usage
// await synth.do.dump({paths: [['do/get/javascript', 'lib/javascript/integration/modules'], ['do/get/javascript', 'lib/javascript/integration/modules/tests/exports']]})

const getDependencies = async (name, {getShallowDependencies, transitive=true}={}, dependencies={}) => {
    if (name in dependencies) {
        return
    }
    const mine = await getShallowDependencies(name) || []
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
        let seeds
        if (typeof n === 'string') {
            seeds = [n]
        } else if (n instanceof RegExp) {
            seeds = synth.names().filter(name => n.test(name))
        } else {
            throw new Error(`invalid element path must be [...string] or [...string, RegExp]`)
        }

        for (const seed of seeds) {
            const deps = await getDependencies(seed, {
                getShallowDependencies: async name => {
                    if (!synth.has(name)) {
                        return []
                    }
                    const rawDeps = await synth.getAttribute({name, attribute: 'deps'}) || []
                    const depmap = await synth.getAttribute({name, attribute: 'depmap'}) || {}
                    const deps = rawDeps.map(([dep]) => dep)
                    const impliedDeps = deps.map((dep) => dep.replace(/^@\//, ''))
                    const mappedDeps = deps.map((dep) => depmap[dep])

                    // include an explicity importmap if necessary.
                    if (JSON.stringify(impliedDeps) != JSON.stringify(mappedDeps)) {
                        units[`importmap[${name}]`] = {type: "json", source: JSON.stringify(depmap)}
                    }
                    return mappedDeps
                },
            })

            for (const dep of Object.keys(deps)) {
                if (!synth.has(dep)) {
                    console.warn(`synth does not have a unit named '${dep}', skipping`)
                    continue
                }
                units[dep] = synth.read(dep)
            }
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
        lines.push('```' + (type || ''))
        lines.push(source)
        lines.push('```')
        lines.push('')
    }

    return lines.join("\n")
}
