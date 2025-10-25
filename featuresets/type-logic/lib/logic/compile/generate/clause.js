import ops from '@/lib/logic/compile/generate/ops';

/**
 * Generates the JavaScript code for a single clause within a predicate's resolver.
 * Optimized for performance on the hot path.
 * @param {object} clause - The IR for the clause { declaredVars, body, ... }.
 * @param {number} clauseId - The index of this clause within its predicate.
 * @returns {string} The generated JavaScript code block for this clause's case.
 */
export default function generateClause(clause, clauseId) {
    // Generate the key: Symbol('value') pairs string directly
    const localSymbolsInit = clause.declaredVars.map(v => `'${v}': Symbol('${v}')`).join(',');

    // Generate the switch cases for the clause body goals
    const bodyCases = clause.body.map((subGoal, pc) => {
        const generator = ops[subGoal.type];
        if (!generator) {
            throw new Error(`Unknown goal type: ${subGoal.type}`);
        }
        const generatedCode = generator(subGoal, clauseId, pc);
        return `
        case ${pc}: {
            ${generatedCode}
        }`;
    }).join('\n');

    return `
    let {subgoalRedoKey, subgoalSolution, resume} = step;
    // 'parentScopes' is the incoming scope array [..., parentData] or null
    // 'vars', 'bindings', 'scopes' are clause-instance specific state
    let {pc, oppc, vars, bindings, scopes} = resume ?? {}; // Renamed scopes

    if (pc === undefined) { // First time entering this clause instance
        const parentScope = parentScopes ? parentScopes[parentScopes.length - 1] : null;
        vars = { ...parentScope?.vars, ${localSymbolsInit} };
        bindings = parentScope?.bindings || {};
        scopes = parentScopes || [];
        pc = 0; // Start execution at the first goal
    }

    // Main switch to execute the appropriate sub-goal based on the Program Counter (pc).
    switch (pc) {
        ${bodyCases}

        // Exit case
        case ${clause.body.length}: { // PC after the last goal
            // Pass the current bindings object directly
            yieldValue = { type: 'exit', solution: bindings };
            break;
        }

        default: {
            throw new Error(\`Invalid program counter in clause ${clauseId}: \${pc}\`);
        }
    }
`;
}
