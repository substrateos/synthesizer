import ops from '@/lib/logic/compile/generate/ops';

export default function generateClause(clause, clauseId) {
    const initialVarsExpression = `{${
        clause.declaredVars.map(v => `${v}: Symbol('${v}')`).join(',')
    }}`;

    const bodyCases = clause.body.map((subGoal, index) => {
        const generator = ops[subGoal.type];
        if (!generator) {
            throw new Error(`Unknown goal type: ${subGoal.type}`);
        }
        const generatedCode = generator(subGoal, clauseId, index);
        return `
        case ${index}: {
            ${generatedCode}
        }`;
    }).join('\n');

    return `
    let {subgoalRedoKey, subgoalSolution, resume} = step
    let {pc, oppc, vars, bindings} = resume ?? {}

    if (pc === undefined) {
        const parentVars = scope?.vars || {};
        const parentBindings = scope?.bindings || {};
        vars = { ...parentVars, ...${initialVarsExpression} };
        bindings = parentBindings;
        pc = 0;
    }

    // Main switch to execute the appropriate sub-goal based on the Program Counter.
    switch (pc) {
        ${bodyCases}

        // If all sub-goals succeeded, we exit with a solution.
        case ${clause.body.length}: {
            yieldValue = { type: 'exit', solution: bindings };
            break;
        }

        default: {
            throw new Error(\`Invalid program counter: \${pc}\`);
        }
    }
`;
}