import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ target, call, template, resolverName }, clauseId, pc) => {
    return `
findallSolutions = resume.findallSolutions ?? [];
switch (oppc) {
case undefined:
    yieldValue = { // Initial 'call' for this subgoal.
        type: 'call',
        op: 'call',
        resolver: ${resolverName}.bind(null, null),
        goal: [${call.arguments.map(node => value(node, 'bindings')).join(', ')}],
        resume: { clauseId: ${clauseId}, pc: ${pc}, bindings, vars, oppc: 1 }
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
        resume = { clauseId: ${clauseId}, pc: ${pc}, bindings, vars};
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

