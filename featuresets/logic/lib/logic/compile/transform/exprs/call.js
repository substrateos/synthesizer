import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

export default ({ resolverExpr, argsExpr, startLocation, resumeProps, tracerExpr, solutionExpr=[] }) => {
    if (typeof argsExpr !== 'string') {
        throw new Error("expr for args must be simple expression")
    }

    if (typeof resolverExpr !== 'string') {
        throw new Error("expr for resolver must be simple expression")
    }

    const location = JSON.stringify(startLocation);
    
    const resumeTokenProperties = `clauseId, bindings, vars, scopes${resumeProps ? `, ${resumeProps}` : ''}`;

    const tracerProp = tracerExpr ? `tracer: ${tracerExpr}` : '';

    return switchExpr('oppc', [
        ['undefined', // This is the first CALL for this subgoal
            `const resolver = ${resolverExpr}`,
            `if (typeof resolver !== 'function') {`,
            `    // The variable didn't hold a function, fail the call.`,
            `    yieldValue = { type: 'fail', location: ${location} };`,
            `    continue;`,
            `}`,
            `yieldValue = { // Initial 'call' for this subgoal.`,
            `    type: 'call',`,
            `    op: 'call',`,
            `    resolver,`,
            `    goal: ${argsExpr},`,
            `    resume: { ${resumeTokenProperties}, pc, oppc: 1 },`,
            `    bindings,`,
            `    location: ${location},`,
            `    ${tracerProp}`,
            `};`,
            e => e.continue()
        ],
        [0,  // This is a REDO request
            `// A redo just needs the key.`,
            `yieldValue = { // Request a 'redo' for this subgoal.`,
            `    type: 'call',`,
            `    op: 'redo',`,
            `    key: resume.subgoalRedoKey, // Key provided by previous EXIT`,
            `    resume: { ${resumeTokenProperties}, pc, oppc: 1 },`,
            `    location: ${location},`,
            `};`,
            e => e.continue()
        ],
        [1,  // Resuming after a subgoal EXIT or FAIL
            `if (subgoalSolution) { // Subgoal succeeded`,
            solutionExpr, 
            `    if (subgoalRedoKey) { // More solutions might exist`,
            `        yieldValue = {`,
            `            type: 'fork',`,
            `            forks: [`,
            `                { // Schedule a REDO task`,
            `                    resume: { ${resumeTokenProperties}, pc, oppc: 0, subgoalRedoKey: subgoalRedoKey },`,
            `                },`,
            `            ],`,
            `            resume: { // Continue forward *now* with the current solution`,
            `                ${resumeTokenProperties}, pc: pc + 1, bindings: unify.mergeBindings(bindings, subgoalSolution),`,
            `            },`,
            `            location: ${location},`,
            `        };`,
            `        continue;`,
            `    } else {`,
            `        // This was the *last* solution. Merge bindings and advance PC.`,
            `        pc++;`,
            `        bindings = unify.mergeBindings(bindings, subgoalSolution);`,
            `        oppc = undefined;`,
            `        subgoalRedoKey = undefined;`,
            `        subgoalSolution = undefined;`,
            `        // Fallthrough to the next instruction (case pc + 1)`,
            `    }`,
            `} else {`,
            `    // The subgoal failed (subgoalSolution is undefined).`,
            `    yieldValue = { type: 'fail', location: ${location} };`,
            `    continue;`,
            `}`,
            e => e.fallthrough()
        ]
    ])
};