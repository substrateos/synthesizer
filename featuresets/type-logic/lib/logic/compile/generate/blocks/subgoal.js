import value from "@/lib/logic/compile/generate/blocks/value.js";
import ground from "@/lib/logic/compile/generate/blocks/ground.js";

/**
 * Generates the complete 'switch(oppc){...}' block for a subgoal call.
 * @param {object} subgoal - The IR for the subgoal.
 * For static: { resolverName, scopes (code string) }
 * For dynamic: { isDynamic: true }
 * For fallback: { goalArgs: 'goal' }
 * @param {string} resumeTokenProperties - A code string of properties for the resume object (e.g., "clauseId: 0, bindings, vars, scopes").
 * @param {number} pc - The program counter (index) of this subgoal op.
 * @returns {string} The generated code block.
 */
export default function generateSubgoalBlock(subgoal, resumeTokenProperties, pc) {
    const { call, isDynamic, resolverName, scopeDepth, goalArgs, startLocation } = subgoal;

    // This block prepares the `resolver` (the function to call)
    let resolverSetup;
    if (isDynamic) {
        // --- Dynamic Call ---
        // Resolve the variable to get the pre-bound function
        resolverSetup = `
const resolver = ${value(call.callee, 'bindings')};

if (typeof resolver !== 'function') {
    // The variable didn't hold a function, fail the call.
    yieldValue = { type: 'fail', location };
    continue;
}
`;
    } else {
        // Nested predicate: Pass the slice representing the parent chain.
        // The runtime variable 'scopes' holds the *full* chain including the current level.
        // Slicing up to scopeDepth gives [globalData, ..., parent_of_definition_Data].
        const scopes = (scopeDepth === 0) ? 'null' : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth+1})`;
        resolverSetup = `
const resolver = ${resolverName}.bind(null, ${scopes});
`;
    }

    // This prepares the code snippet for the goal arguments.
    // Use `goalArgs` if it's the special 'goal' string (for fallbacks),
    // otherwise build the argument array from the AST.
    const goalArgsCode = goalArgs === 'goal'
        ? 'goal' // Pass the original 'goal' array variable
        : `[${call.arguments.map(node => ground(node, 'bindings')).join(', ')}]`;

    // The rest of the logic (switch on oppc) is about state management
    // (CALL, REDO, EXIT, FAIL) and remains unchanged.
    return `
const location = ${JSON.stringify(startLocation)}
switch (oppc) {
case undefined: { // This is the first CALL for this subgoal
    ${resolverSetup}
    yieldValue = { // Initial 'call' for this subgoal.
        type: 'call',
        op: 'call',
        resolver, // The function (bound or dynamic)
        goal: ${goalArgsCode}, // The arguments
        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 1 },
        location,
    };
    continue;
}
case 0: { // This is a REDO request
    // A redo just needs the key. The runtime GoalSeries handles finding
    // the existing generator instance to call .next() on.
    yieldValue = { // Request a 'redo' for this subgoal.
        type: 'call',
        op: 'redo',
        key: resume.subgoalRedoKey, // Key provided by previous EXIT
        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 1 },
        location,
    };
    continue;
}
case 1: { // Resuming after a subgoal EXIT or FAIL
    if (subgoalSolution) { // Subgoal succeeded
        if (subgoalRedoKey) { // More solutions might exist
            yieldValue = {
                type: 'fork',
                forks: [
                    { // Schedule a REDO task to get the next solution later
                        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 0, subgoalRedoKey: subgoalRedoKey },
                    },
                ],
                resume: { // Continue forward *now* with the current solution
                    ${resumeTokenProperties}, pc: ${pc + 1}, bindings: { ...bindings, ...subgoalSolution },
                },
                location,
            };
            continue;
        } else {
            // This was the *last* solution. Merge bindings and advance PC.
            pc++;
            bindings = { ...bindings, ...subgoalSolution };
            oppc = undefined;
            subgoalRedoKey = undefined;
            subgoalSolution = undefined;
            // Fallthrough to the next instruction (case pc + 1)
        }
    } else {
        // The subgoal failed (subgoalSolution is undefined).
        yieldValue = { type: 'fail', location };
        continue;
    }
}
}
`;
}
