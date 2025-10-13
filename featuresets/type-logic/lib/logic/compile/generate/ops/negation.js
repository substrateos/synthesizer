import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ goal, resolverName }, clauseId, pc) => {
    // use a unique key
    return `
switch (oppc) {
case undefined:
    // Initial call. Yield a 'call' signal.
    yieldValue = {
        type: 'call',
        resolver: ${resolverName}.bind(null, null),
        goal: [${goal.arguments.map(node => value(node, 'bindings')).join(', ')}],
        resume: { clauseId: ${clauseId}, pc: ${pc}, bindings, vars, oppc: 1 }
    };
    continue;
case 1: {
    if (subgoalSolution) {
        // Sub-goal succeeded. We will fail, the solver will clean up the subgoal;
        yieldValue = { type: 'fail' };
        continue;
    } else {
        // Sub-goal was exhausted without finding a solution. The negation succeeds.
        // Advance the program counter and continue.
        pc++;
        oppc = undefined;
        subgoalSolution = undefined;
        // fallthrough to the next instruction in the parent clause.
    }
    break
}
}
`;
}
