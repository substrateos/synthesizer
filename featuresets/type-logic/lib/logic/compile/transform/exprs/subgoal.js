import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

export default (subgoal) => {
    const { call, isDynamic, resolverName, scopeDepth, goalArgs, startLocation } = subgoal;
    const resumeTokenProperties = `clauseId, bindings, vars, scopes`;

    // This block prepares the `resolver` (the function to call)
    let resolverSetup;
    if (isDynamic) {
        // --- Dynamic Call ---
        resolverSetup = [
            `const resolver = ${valueExpr(call.callee, 'bindings')};`,
            `if (typeof resolver !== 'function') {`,
            `    // The variable didn't hold a function, fail the call.`,
            `    yieldValue = { type: 'fail', location };`,
            `    continue;`,
            `}`
        ];
    } else {
        // --- Static Call ---
        // Nested predicate: Pass the slice representing the parent chain.
        // The runtime variable 'scopes' holds the *full* chain including the current level.
        // Slicing up to scopeDepth gives [globalData, ..., parent_of_definition_Data].
        const scopes = (scopeDepth === 0) ? 'null' : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;
        resolverSetup = [
            `const resolver = ${resolverName}.bind(null, ${scopes});`
        ];
    }

    // This prepares the code snippet for the goal arguments.
    const goalArgsCode = goalArgs === 'goal'
        ? 'goal' // Pass the original 'goal' array variable
        : `[${call.arguments.map(node => groundExpr(node, 'bindings')).join(', ')}]`;

    return [
        `const location = ${JSON.stringify(startLocation)}`,
        switchExpr('oppc', [
            ['undefined', // This is the first CALL for this subgoal
                ...resolverSetup,
                `yieldValue = { // Initial 'call' for this subgoal.`,
                `    type: 'call',`,
                `    op: 'call',`,
                `    resolver, // The function (bound or dynamic)`,
                `    goal: ${goalArgsCode}, // The arguments`,
                `    resume: { ${resumeTokenProperties}, pc, oppc: 1 },`,
                `    location,`,
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
                `    location,`,
                `};`,
                e => e.continue()
            ],
            [1,  // Resuming after a subgoal EXIT or FAIL
                `if (subgoalSolution) { // Subgoal succeeded`,
                `    if (subgoalRedoKey) { // More solutions might exist`,
                `        yieldValue = {`,
                `            type: 'fork',`,
                `            forks: [`,
                `                { // Schedule a REDO task`,
                `                    resume: { ${resumeTokenProperties}, pc, oppc: 0, subgoalRedoKey: subgoalRedoKey },`,
                `                },`,
                `            ],`,
                `            resume: { // Continue forward *now* with the current solution`,
                `                ${resumeTokenProperties}, pc: pc + 1, bindings: { ...bindings, ...subgoalSolution },`,
                `            },`,
                `            location,`,
                `        };`,
                `        continue;`,
                `    } else {`,
                `        // This was the *last* solution. Merge bindings and advance PC.`,
                `        pc++;`,
                `        bindings = { ...bindings, ...subgoalSolution };`,
                `        oppc = undefined;`,
                `        subgoalRedoKey = undefined;`,
                `        subgoalSolution = undefined;`,
                `        // Fallthrough to the next instruction (case pc + 1)`,
                `    }`,
                `} else {`,
                `    // The subgoal failed (subgoalSolution is undefined).`,
                `    yieldValue = { type: 'fail', location };`,
                `    continue;`,
                `}`,
                e => e.fallthrough()
            ]
        ])
    ];
};

