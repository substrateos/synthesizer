import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

/**
 * Generates the JavaScript code for a single clause within a predicate's resolver.
 * Optimized for performance on the hot path.
 * @param {object} clause - The IR for the clause { declaredVars, body, ... }.
 * @param {number} clauseId - The index of this clause within its predicate.
 * @returns {function} An emitter function that generates the clause's logic.
 */
export default function clauseExpr({declaredVars, body}) {
    const localSymbolsInit = declaredVars.map(v => `'${v}': Symbol('${v}')`).join(',');
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
                ...body.map((expr, pc) => [pc, expr]),
                [body.length, // exit case, pc after the last goal
                    `const solution = unify.flatten(null, bindings, Object.getOwnPropertySymbols(bindings));`, // before exiting, ensure Local layer is self-contained
                    `yieldValue = { type: 'exit', solution };`,
                    e => e.break()],
                ['default',
                    `throw new Error(\`Invalid program counter in clause \${clauseId}: \${pc}\`);`,
                    e => e.break()],
            ]),
        );
    };
}