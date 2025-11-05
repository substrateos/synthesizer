import astNodeToValue from "@/lib/fetchUnits/javascript/astNodeToValue.js"
import findStaticExports from "@/lib/fetchUnits/javascript/findStaticExports.js"
import parse from "@/lib/fetchUnits/javascript/parse.js"

/**
 * Finds the target for a given baseName.
 * @param {string} baseName - The base path (e.g., "foo/bar")
 * @param {[string, string][]} subpathEntries - The array of [name, subpath] entries
 * @returns {string | undefined} The matching target (e.g., "foo/bar") or undefined
 * @throws {Error} If multiple matching subpaths are found.
 */
function findTarget(baseName, subpathEntries) {
    const matches = subpathEntries.filter(([p]) => 
        p === baseName || (
            p.startsWith(baseName) &&
            p.substring(baseName.length).startsWith('.')
        )
    );

    if (matches.length > 1) {
        throw new Error(
            `Ambiguous target for "${baseName}": Found multiple files: ${matches.map(([k]) => k).join(', ')}`,
        );
    }

    return matches[0]?.[1]; // Returns the single match or undefined if length is 0
}

export function nameForSubpath(subpath) {
    if (/^(do|globals)\//.test(subpath)) {
        return subpath.replace(/(\.[^\/]+)$/, '') // trim suffix
    }
    return subpath
}

export default async (base, subpaths, sharedAttributes={}) => {
    const subpathEntries = subpaths.map(subpath => [nameForSubpath(subpath), subpath])

    return Object.fromEntries(await Promise.all(subpathEntries.map(async ([name, subpath]) => {
        const attributes = {}
        const url = new URL(subpath, base)
        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`response is not ok; status="${response.status} ${response.statusText}"`)
        }

        const contentType = response.headers.get('Content-Type')
        if (contentType.startsWith('application/javascript') ||
            contentType.startsWith('text/javascript')) {
            attributes.type = 'javascript'
        }

        if (subpath.endsWith('.md')) {
            attributes.type = 'markdown'
        }

        if (subpath.endsWith('.ohm')) {
            attributes.type = 'ohm'
        }

        if (subpath.endsWith('.dom-renkon.js')) {
            attributes.type = 'dom-renkon'
        }

        if (subpath.endsWith('.logic.js')) {
            attributes.type = 'logic'
        }

        const isExampleFor = name.match(/^(.+)\/examples\//)
        if (isExampleFor) {
            let target = isExampleFor[1]
            target = findTarget(target, subpathEntries) ?? target
            attributes.exampleFor = target
            // we assume examples can also be used as tests
            attributes.testFor = target
        }

        const isTestFor = name.match(/^(.+)\/tests\//)
        if (isTestFor) {
            let target = isTestFor[1]
            target = findTarget(target, subpathEntries) ?? target
            attributes.testFor = target
        }

        let source = await response.text()
        if (attributes.type === 'javascript') {
            const {ast} = parse({source})
            const {
                consts: constNodes,
                default: defaultNode,
            } = findStaticExports({ast})
            if (constNodes?.attributes) {
                Object.assign(attributes, astNodeToValue({node: constNodes?.attributes}))
            }

            if (attributes.type !== 'javascript') {
                if (defaultNode) {
                    const defaultExportValue = astNodeToValue({node: defaultNode})
                    source = typeof defaultExportValue === 'string' ? defaultExportValue : JSON.stringify(defaultExportValue)
                }
            }
        }
        Object.assign(attributes, sharedAttributes)
        return [name, {source, ...attributes}]
    })))
}
