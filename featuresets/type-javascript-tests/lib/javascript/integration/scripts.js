import parse from "@/lib/javascript/parse.js"
import findFreeVariables from "@/lib/javascript/findFreeVariables.js"

export default function(code) {
    const {ast} = parse({source: code})
    const freeVariables = findFreeVariables({ast})
    return {
        freeVariables,
    }
}
