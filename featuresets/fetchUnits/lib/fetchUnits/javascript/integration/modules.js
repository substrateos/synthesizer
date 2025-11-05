import parse from "@/lib/fetchUnits/javascript/parse.js"
import astNodeToValue from "@/lib/fetchUnits/javascript/astNodeToValue.js"
import findStaticExports from "@/lib/fetchUnits/javascript/findStaticExports.js"

export default function(code) {
    const {ast} = parse({source: code})
    const {
        consts,
        defaultExport,
    } = findStaticExports({ast})
    return {
        staticExports: {
            consts: Object.fromEntries(Object.entries(consts).map(([name, node]) => [name, astNodeToValue({node, onError: () => {}})])),
            default: astNodeToValue({node: defaultExport, onError: () => {}}),
        },
    }
}
