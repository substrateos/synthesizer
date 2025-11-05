import value from "@/lib/logic/compile/generate/blocks/value.js";

/**
 * Generates the JavaScript code for a negation goal (!myPred(...)).
 * @param {object} subgoal - The IR for the negation { goal, resolverName, scopeDepth }.
 * @param {number} clauseId - The index of the containing clause.
 * @param {number} pc - The program counter (index) of this operation.
 * @returns {string} The generated JavaScript code block.
 */
export default ({ goal, resolverName, scopeDepth }, clauseId, pc) => {
    // 1. Determine the scope slice code based on the definition depth
    // 'scopes' is the runtime array [globalData, ..., parentData, currentData]
    const scopeSliceCode = (scopeDepth === 0)
        ? 'null' // Global predicates get null scope
        : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth+1})`;

    // 2. Generate argument code
    const goalArgsCode = `[${goal.arguments.map(node => value(node, 'bindings')).join(', ')}]`;

    // 3. Return the switch block
    return `
switch (oppc) {
case undefined: {
    // Initial call. Bind the resolver to the correct lexical scope.
    const resolver = ${resolverName}.bind(null, ${scopeSliceCode});
    yieldValue = {
        type: 'call',
        resolver,
        goal: ${goalArgsCode},
        resume: { clauseId: ${clauseId}, pc: ${pc}, bindings, vars, scopes, oppc: 1 }
    };
    continue;
}
case 1: {
    if (subgoalSolution) {
        // Sub-goal succeeded, so the negation (!) fails.
        yieldValue = { type: 'fail' };
        continue;
    } else {
        // Sub-goal was exhausted (failed), so the negation (!) succeeds.
        // Advance the program counter and fall through to the next instruction.
        pc++;
        oppc = undefined;
        subgoalSolution = undefined;
    }
    break; // Fallthrough
}
}
`;
}
