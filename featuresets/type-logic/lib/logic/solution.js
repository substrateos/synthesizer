import { resolve, ground, symbolsIn } from "@/lib/logic/unify";

/**
 * A simplified version of resolveSolution that returns a simple object
 * mapping variable names to their fully resolved values.
 */
export default function resolveSolutionValues(goal, finalBindings) {
    const solution = {};
    const queryVariables = [...symbolsIn(goal)];

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