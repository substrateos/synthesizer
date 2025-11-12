import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

/**
 * Generates the JavaScript code for a negation goal (!myPred(...)).
 * @param {object} subgoal - The IR for the negation { goal, resolverName, scopeDepth }.
 * @param {number} clauseId - The index of the containing clause.
 * @param {number} pc - The program counter (index) of this operation.
 * @returns {string} The generated JavaScript code block.
 */
export default ({ goal, resolverName, scopeDepth }) => {
    const scopeSliceCode = (scopeDepth === 0)
        ? 'null' // Global predicates get null scope
        : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;

    const goalArgsCode = `[${goal.arguments.map(node => valueExpr(node, 'bindings')).join(', ')}]`;

    return switchExpr('oppc', [
        ['undefined',
            `// Initial call. Bind the resolver to the correct lexical scope.`,
            `const resolver = ${resolverName}.bind(null, ${scopeSliceCode});`,
            `yieldValue = {`,
            `    type: 'call',`,
            `    resolver,`,
            `    goal: ${goalArgsCode},`,
            `    resume: { clauseId, pc, bindings, vars, scopes, oppc: 1 }`,
            `};`,
            e => e.continue()
        ],
        [1,
            `if (subgoalSolution) {`,
            `    // Sub-goal succeeded, so the negation (!) fails.`,
            `    yieldValue = { type: 'fail' };`,
            `    continue;`,
            `} else {`,
            `    // Sub-goal was exhausted (failed), so the negation (!) succeeds.`,
            `    pc++;`,
            `    oppc = undefined;`,
            `    subgoalSolution = undefined;`,
            `}`,
            `// Fallthrough`,
            e => e.fallthrough()
        ]
    ])
}