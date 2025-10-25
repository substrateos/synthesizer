import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ target, call, template, resolverName, scopeDepth }, clauseId, pc) => {
    // 1. Determine the scope slice code based on the definition depth
    // 'scopes' is the runtime array [globalData, ..., parentData, currentData]
    const scopeSliceCode = (scopeDepth === 0)
        ? 'null' // Global predicates get null scope
        : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth+1})`;

    // 2. Generate argument code
    const goalArgsCode = `[${call.arguments.map(node => value(node, 'bindings')).join(', ')}]`;

    return `
findallSolutions = resume.findallSolutions ?? [];
switch (oppc) {
case undefined:
    const resolver = ${resolverName}.bind(null, ${scopeSliceCode});
    yieldValue = { // Initial 'call' for this subgoal.
        type: 'call',
        op: 'call',
        resolver,
        goal: ${goalArgsCode},
        resume: { clauseId: ${clauseId}, pc: ${pc}, bindings, vars, scopes, oppc: 1 }
    }
    continue;
case 1:
    if (subgoalSolution) {
        // Solution found. Create a combined binding context for resolution.
        const subgoalBindings = { ...bindings, ...subgoalSolution };

        // Build the result object from the template and add to list.
        const subgoalResult = ${value(template, 'subgoalBindings')};
        findallSolutions.push(subgoalResult);

        // If more solutions are available, get them. Otherwise, continue.
        if (subgoalRedoKey) {
            yieldValue = {
                type: 'call',
                op: 'redo',
                key: subgoalRedoKey,
                resume: {
                    clauseId: ${clauseId},
                    pc: ${pc},
                    bindings,
                    vars,
                    scopes,
                    oppc: 1,
                    findallSolutions,
                }
            }
            continue;
        }
    }

    bindings = unify(${value(target, 'bindings')}, findallSolutions, bindings, location);
    if (bindings) {
        pc++; // Success
        resume = { clauseId: ${clauseId}, pc: ${pc}, bindings, vars, scopes};
        oppc = undefined;
        findallSolutions = undefined;
        subgoalSolution = undefined;
        subgoalResult = undefined;
        // fallthrough
    } else {
        yieldValue = { type: 'fail' };
        break;
    }
}
`;
};

