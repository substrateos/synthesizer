import parse from "@workspace/lib/javascript/parse"
import astNodeToValue from "@workspace/lib/javascript/astNodeToValue"
import findImports from "@workspace/lib/javascript/findImports"
import findExports from "@workspace/lib/javascript/findExports"
import findStaticExports from "@workspace/lib/javascript/findStaticExports"

export default function(code) {
    const {ast} = parse({source: code})
    const {
        consts,
        defaultExport,
    } = findStaticExports({ast})
    return {
        imports: findImports({ast}),
        exports: findExports({ast}),
        staticExports: {
            consts: Object.fromEntries(Object.entries(consts).map(([name, node]) => [name, astNodeToValue({node, onError: () => {}})])),
            default: astNodeToValue({node: defaultExport, onError: () => {}}),
        },
    }
}
