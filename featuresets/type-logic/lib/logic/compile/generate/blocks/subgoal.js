import value from '@/lib/logic/compile/generate/blocks/value';

/**
 * Generates the complete 'switch(oppc){...}' block for a subgoal call.
 * This is a shared helper used by the normal 'subgoal' op and the special
 * 'fallback' case in the predicate generator.
 * @param {object} subgoal - The IR for the subgoal.
 * @param {string} resumeTokenProperties - A code string of properties for the resume object.
 * @returns {string} The generated code block.
 */
export default function generateSubgoalBlock(subgoal, resumeTokenProperties, pc) {
    const { call, isDynamic, resolverName, isLexicalChild } = subgoal;

    // This block prepares the `resolver` (raw) and `scope` variables.
    const resolverSetup = isDynamic
        ? `
const scope = null;
let resolver = ${value(call.callee, 'bindings')};

if (typeof resolver !== 'function') {
    yieldValue = { type: 'fail' };
    continue;
}

if (typeof resolver[resolverTag] === 'function') {
    resolver = resolver[resolverTag]
}
`
        : `
const scope = ${isLexicalChild ? `{ vars, bindings }` : `null`};
const resolver = ${resolverName}.bind(null, scope);
`;

    // This prepares the code snippet for the goal arguments.
    const goalArgs = subgoal.goalArgs ||
        `[${subgoal.call.arguments.map(node => value(node, 'bindings')).join(', ')}]`;

    return `
switch (oppc) {
case undefined: {
    ${resolverSetup}
    yieldValue = { // Initial 'call' for this subgoal.
        type: 'call',
        op: 'call',
        resolver,
        goal: ${goalArgs},
        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 1 }
    };
    continue;
}
case 0: {
    // A redo is simpler; the resolver and scope are already in the closure
    // from the 'undefined' case. The solver just needs the key.
    yieldValue = { // Request a 'redo' for this subgoal.
        type: 'call',
        op: 'redo',
        key: resume.subgoalRedoKey,
        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 1 },
    };
    continue;
}
case 1: {
    if (subgoalSolution) {
        if (subgoalRedoKey) {
            yieldValue = {
                type: 'fork',
                forks: [
                    { // Backtrack into the subgoal later to get the next solution.
                        resume: { ${resumeTokenProperties}, pc: ${pc}, oppc: 0, subgoalRedoKey: subgoalRedoKey },
                    },
                ],
                resume: { // Continue forward with the current solution.
                    ${resumeTokenProperties}, pc: ${pc + 1}, bindings: { ...bindings, ...subgoalSolution },
                },
            };
            continue;
        } else {
            // This was the only solution. Merge bindings and advance the program counter.
            pc++;
            bindings = { ...bindings, ...subgoalSolution };
            oppc = undefined;
            subgoalRedoKey = undefined;
            subgoalSolution = undefined;
        }
    } else {
        // The subgoal failed to find any (more) solutions.
        yieldValue = { type: 'fail' };
        continue;
    }
}
}
`;
}