import parse from "@/lib/fetchUnits/javascript/parse"
import astNodeToValue from "@/lib/fetchUnits/javascript/astNodeToValue"
import findStaticExports from "@/lib/fetchUnits/javascript/findStaticExports"

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
