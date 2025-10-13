import { resolve, ground } from "@/lib/logic/unify";

/**
 * Recursively finds all unique symbols (logic variables) in a data structure.
 */
function findSymbols(term, symbols = new Set()) {
    if (typeof term === 'symbol') {
        symbols.add(term);
    } else if (Array.isArray(term)) {
        term.forEach(element => findSymbols(element, symbols));
    } else if (typeof term === 'object' && term !== null) {
        Object.values(term).forEach(value => findSymbols(value, symbols));
    }
    return symbols;
}

/**
 * A simplified version of resolveSolution that returns a simple object
 * mapping variable names to their fully resolved values.
 */
export default function resolveSolutionValues(goal, finalBindings) {
    const solution = {};
    const queryVariables = findSymbols(goal);

    for (const variable of queryVariables) {
        const originalValue = resolve(variable, finalBindings).value;

        // Check if the variable was actually bound to something.
        if (originalValue !== variable || Object.hasOwn(finalBindings, variable)) {
            const value = ground(variable, finalBindings);
            // Store under the original variable.
            solution[variable] = value
            // Also store under the string key for the variable.
            solution[variable.description] = value
        }
    }

    if (queryVariables.size === 0 && finalBindings) {
        return {};
    }
    
    return solution;
}