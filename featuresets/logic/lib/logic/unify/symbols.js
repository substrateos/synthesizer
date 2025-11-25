import { symbolsTag, _ } from "@/lib/logic/tags.js"

/**
 * Recursively finds all unique symbols (logic variables) in a data structure.
 */
export default function* symbols(term, visited = new Set(), symbolsRec) {
    if (!symbolsRec) {
        symbolsRec = function* (o) { yield* symbols(o, visited, symbolsRec) }
    }
    if (typeof term === 'symbol') {
        if (!visited.has(term)) {
            visited.add(term)
            yield term
        }
    } else if (Array.isArray(term)) {
        if (visited.has(term)) return; // Stop recursion if already visited
        visited.add(term);

        for (const element of term) {
            yield* symbolsRec(element)
        }
    } else if (typeof term === 'object' && term !== null) {
        if (visited.has(term)) return; // Stop recursion if already visited
        visited.add(term);

        if (symbolsTag in term) {
            yield* term[symbolsTag](symbolsRec)
        } else {
            for (const value of Object.values(term)) {
                yield* symbolsRec(value)
            }
        }
    }
}