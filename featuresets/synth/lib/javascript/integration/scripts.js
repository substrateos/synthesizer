import parse from "@workspace/lib/javascript/parse"
import findFreeVariables from "@workspace/lib/javascript/findFreeVariables"

export default function(code) {
    const {ast} = parse({source: code})
    const freeVariables = findFreeVariables({ast})
    return {
        freeVariables,
    }
}
