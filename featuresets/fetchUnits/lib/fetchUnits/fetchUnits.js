import astNodeToValue from '@/lib/fetchUnits/javascript/astNodeToValue.js'
import findStaticExports from '@/lib/fetchUnits/javascript/findStaticExports.js'
import parse from '@/lib/fetchUnits/javascript/parse.js'

export default async (base, subpaths, sharedAttributes={}) => {
    return Object.fromEntries(await Promise.all(subpaths.map(async subpath => {
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

        let name
        if (subpath.endsWith('.md')) {
            attributes.type = 'markdown'
            name = subpath
        }

        if (!name) {
            name = subpath.replace(/(\.[^.]+)$/, '') // trim final suffix
        }

        // trim additional suffix
        if (name.endsWith('.dom-renkon')) {
            attributes.type = 'dom-renkon'
            name = name.replace(/\.dom-renkon$/, '')
        }

        const isExampleFor = name.match(/^(.+)\/examples\//)
        if (isExampleFor) {
            attributes.exampleFor = isExampleFor[1]
            // we assume examples can also be used as tests
            attributes.testFor = isExampleFor[1]
        }
        const isTestFor = name.match(/^(.+)\/tests\//)
        if (isTestFor) {
            attributes.testFor = isTestFor[1]
        }

        let source = await response.text()
        if (attributes.type === 'javascript') {
            source = source + `\n//# sourceURL=${name}`
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
