import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

/**
 * Generates the JavaScript code for a single clause within a predicate's resolver.
 * Optimized for performance on the hot path.
 * @param {object} clause - The IR for the clause { declaredVars, body, ... }.
 * @param {number} clauseId - The index of this clause within its predicate.
 * @returns {function} An emitter function that generates the clause's logic.
 */
export default function clauseExpr({ declaredVars, body }) {
    const localSymbolsInit = declaredVars.map(v => `'${v}': Symbol('${v}')`).join(',');

    // We add the mailbox handling block at a special PC index.
    const drainRunnableGoalsAddr = body.length + 2;

    return e => {
        e.emit(
            `let {subgoalRedoKey, subgoalSolution, resumeValue, resume} = step;`,
            `let {pc, oppc, vars, bindings, scopes} = resume ?? {};`,
            ifExpr('pc === undefined', // First-time clause initialization
                e => e.emit(
                    // 'parentScopes' is the incoming scope array [..., parentData] or null
                    // 'vars', 'bindings', 'scopes' are clause-instance specific state
                    `const parentScope = parentScopes ? parentScopes[parentScopes.length - 1] : null;`,
                    `vars = { ...parentScope?.vars, ${localSymbolsInit} };`,
                    `bindings = unify.flatten(parentScope?.bindings || null, step.callerBindings, goal);`,
                    `scopes = parentScopes || [];`,
                    `pc = 0;`, // Start execution at the first goal
                )),
            switchExpr('pc', [ // Main "computed goto" state machine
                ...body.map((expr, pc) => [pc, [
                    expr,
                    `if (bindings?.[runnableGoalsTag]) {`, // The Reactive Mailbox Check
                    `    yieldValue = {type: 'fork', resume: { clauseId, pc: ${drainRunnableGoalsAddr}, bindings, vars, scopes, postDrainPC: ${pc + 1} } };`, // No branches, just a jump
                    `    continue;`,
                    `}`,
                ]]),

                [body.length, // exit case, pc after the last goal
                    `const solution = unify.flatten(null, bindings, Object.getOwnPropertySymbols(bindings));`, // before exiting, ensure local layer is self-contained
                    `yieldValue = { type: 'exit', solution };`,
                e => e.break()],

                // Calls the system predicate 'scheduleRunnableGoals'.
                [drainRunnableGoalsAddr,
                    `switch (resume?.oppc) {`,
                    `    case undefined: {`,
                    `        yieldValue = {`,
                    `            type: 'call',`,
                    `            op: 'call',`,
                    `            resolver: scheduleRunnableGoals,`,
                    `            goal: [],`, // No args, reads callerBindings
                    `            resume: { clauseId, bindings, vars, scopes, pc: ${drainRunnableGoalsAddr}, oppc: 1, postDrainPC: resume.postDrainPC },`,
                    `            bindings`, // Context
                    `        };`,
                    `        continue;`,
                    `    }`,
                    `    case 0: {`,
                    `        yieldValue = { // Request a 'redo' for this subgoal.`,
                    `            type: 'call',`,
                    `            op: 'redo',`,
                    `            key: resume.subgoalRedoKey, // Key provided by previous EXIT`,
                    `            resume: { clauseId, bindings, vars, scopes, pc: ${drainRunnableGoalsAddr}, oppc: 1, postDrainPC: resume.postDrainPC },`,
                    `        };`,
                    `        continue;`,
                    `    }`,
                    `    case 1: {`,
                    `        if (subgoalSolution) {`,
                    `             const nextBindings = unify.mergeBindings(bindings, subgoalSolution);`,// Success: Merge bindings
                    `             yieldValue = {`,
                    `                 type: 'fork',`,
                    `                 forks: subgoalRedoKey`,
                    `                     ? [{resume: { clauseId, bindings, vars, scopes, pc: ${drainRunnableGoalsAddr}, subgoalRedoKey, oppc: 0, postDrainPC: resume.postDrainPC }}]`,
                    `                     : undefined,`,
                    `                 resume: { clauseId, bindings: nextBindings, vars, scopes, pc: resume.postDrainPC },`, // Return to main flow
                    `             };`,
                    `             subgoalSolution = undefined;`,
                    `             subgoalRedoKey = undefined;`,
                    `             continue;`,
                    `        } else {`,
                    `             yieldValue = { type: 'fail' };`, // Mailbox failed.
                    `             continue;`,
                    `        }`,
                    `    }`,
                    `}`,
                ]
            ]),
        );
    };
}