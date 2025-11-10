// example usage
// await synth.do.dump({paths: [['do/get/javascript', 'lib/javascript/integration/modules'], ['do/get/javascript', 'lib/javascript/integration/modules/tests/exports']]})

const getDependencies = async (name, { getShallowDependencies, transitive = true } = {}, dependencies = {}) => {
    if (name in dependencies) {
        return
    }
    const mine = await getShallowDependencies(name) || []
    dependencies[name] = mine
    if (transitive) {
        for (const a of mine) {
            await getDependencies(a, { getShallowDependencies, transitive }, dependencies)
        }
    }
    return dependencies
}

const getParentPaths = function (path) {
    const fragments = path.split('/')
    return fragments.map((_, i) => fragments.slice(0, i + 1).join('/'))
}

/**
 * Finds the longest backtick sequence (3+) in a string and returns a fence
 * that is one backtick longer, ensuring the content is safely wrapped.
 * @param {string} content
 * @returns {string} e.g., "```" or "````"
 */
function getSafeFence(content = '') {
    // Find all sequences of 3 or more backticks
    const matches = content.match(/`{3,}/g) || [];
    if (matches.length === 0) {
        return '```';
    }
    // Find the length of the longest sequence
    const maxLength = Math.max(...matches.map(match => match.length));
    // Return a fence that is one longer
    return '`'.repeat(maxLength + 1);
}

function render(units, skipNamePattern) {
    const lines = []

    for (const [name, { type, source }] of Object.entries(units)) {
        if (skipNamePattern.test(name)) {
            continue
        }

        const fence = getSafeFence(source);

        lines.push(`###### ${name}`, '')
        lines.push(fence + (type || ''))
        lines.push(source)
        lines.push(fence)
        lines.push('')
    }

    return lines.join("\n")
}

export default async function (handlerInputs) {
    const { action, unit, name, workspace } = this
    const { paths = [], markerFiles = [] } = handlerInputs ?? {}

    function* markerFileProbesFor(name) {
        for (const markerFile of markerFiles) {
            for (const parentPath of getParentPaths(name)) {
                yield `${parentPath}/${markerFile}`
            }
        }
    }

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

        const markers = new Set()

        for (const seed of seeds) {
            const deps = await getDependencies(seed, {
                getShallowDependencies: async name => {
                    if (!synth.has(name)) {
                        return []
                    }
                    const rawDeps = await synth.getAttribute({ name, attribute: 'deps' }) || []
                    const depmap = await synth.getAttribute({ name, attribute: 'depmap' }) || {}

                    const ignore = new Set(['require', 'exports', "@workspace"])

                    const deps = rawDeps.map(([dep]) => dep).filter(dep => !ignore.has(dep))
                    const impliedDeps = deps.map((dep) => dep.replace(/^@\//, ''))
                    const mappedDeps = deps.map((dep) => depmap[dep])

                    // include an explicity importmap if necessary.
                    if (JSON.stringify(impliedDeps) != JSON.stringify(mappedDeps)) {
                        // console.log('JSON.stringify(impliedDeps) != JSON.stringify(mappedDeps)', JSON.stringify(impliedDeps), '!=', JSON.stringify(mappedDeps), name)
                        units[`importmap[${name}]`] = { type: "json", source: JSON.stringify(depmap) }
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

                for (const markerFileProbe of markerFileProbesFor(dep)) {
                    markers.add(markerFileProbe)
                }
            }
        }

        for (const marker of markers) {
            if (synth.has(marker) && !(marker in units)) {
                units[marker] = synth.read(marker)
            }
        }
    }

    // leave out versioned dependencies for now. they are large and likely won't add much.
    // in the future we might want to use tree shaking to include just enough of them, or allow some way to search/resolve them interactively as a "tool"
    const skipNamePattern = /@/
    return render(units, skipNamePattern)
}
