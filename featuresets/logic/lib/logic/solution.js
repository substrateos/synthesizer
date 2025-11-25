import symbols from "@/lib/logic/unify/symbols.js";
import { ground } from "@/lib/logic/unify.js";

/**
 * A simplified version of resolveSolution that returns a simple object
 * mapping variable names to their fully resolved values.
 */
export default function resolveSolutionValues(goal, finalBindings) {
    const solution = {};
    const queryVariables = [...symbols(goal)];

    for (const variable of queryVariables) {
        // Check if the variable was actually bound to something.
        if (variable in finalBindings) {
            const value = ground(variable, finalBindings);
            // Store under the original variable.
            solution[variable] = value
            // Also store under the string key for the variable.
            solution[variable.description] = value
        } else {
            // Save references to unbound values
            solution[variable] = variable
        }
    }

    if (queryVariables.size === 0 && finalBindings) {
        return {};
    }
    
    return solution;
}
