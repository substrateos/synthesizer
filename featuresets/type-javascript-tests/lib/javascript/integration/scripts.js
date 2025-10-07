import parse from "@/lib/javascript/parse"
import findFreeVariables from "@/lib/javascript/findFreeVariables"

export default function(code) {
    const {ast} = parse({source: code})
    const freeVariables = findFreeVariables({ast})
    return {
        freeVariables,
    }
}
