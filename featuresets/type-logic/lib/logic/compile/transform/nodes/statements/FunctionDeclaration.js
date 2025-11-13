import clauseExpr from "@/lib/logic/compile/transform/exprs/clause.js";
import debuggerExpr from "@/lib/logic/compile/transform/exprs/debugger.js";
import transformExpression from "@/lib/logic/compile/transform/nodes/expression.js";
import unifyExpr from "@/lib/logic/compile/transform/exprs/unify.js";

/**
 * Transforms a ClauseInfo object (from analysis) into a clauseExpr.
 * @param {ClauseInfo} clauseInfo - Contains astNode, scope, getRawSource.
 * @returns {object} The final clause IR for the code generator.
 */
export default function transformFunctionDeclaration(clauseInfo) {
    const { astNode, scope: { declaredVariables } } = clauseInfo;
    const stmts = (astNode.body?.body || []);
    const params = astNode.params;

    return clauseExpr({
        declaredVars: [...declaredVariables.keys()],
        body: [
            // treat a `debugger;` as the first statement in a function as though it came *before* rule head unification.
            ...(stmts[0]?.type === 'DebuggerStatement'
                ? [debuggerExpr(stmts[0], clauseInfo)]
                : []
            ),
            unifyExpr({
                left: transformExpression({ type: 'ArrayPattern', elements: params }, clauseInfo),
                right: 'goal',
                startLocation: clauseInfo.getRawSourceLocation(astNode.start),
            }),
            ...stmts.flatMap((stmt, i) => {
                switch (stmt.type) {
                    case 'DebuggerStatement':
                        if (i === 0) { return [] } // handled in transformFunctionDeclaration
                        return [debuggerExpr(stmt, clauseInfo)];
                    case 'ExpressionStatement':
                        if (stmt.expression.type === 'Identifier') {
                            throw new Error(`Invalid goal: A standalone variable ('${stmt.expression.name}') is not a goal. Did you mean to use it in an assignment or a call?`);
                        }
                        return [transformExpression(stmt.expression, clauseInfo)];
                    case 'VariableDeclaration': {
                            // A single `var` statement can declare multiple variables.
                            const vars = stmt.declarations.flatMap(declarator => {
                                // We only generate a goal if there's an initial value (e.g., `= 10`).
                                if (!declarator.init) return [];

                                // We can treat `var A = 10` as being logically equivalent to `A = 10`.
                                // To do this, we'll construct a fake AssignmentExpression node
                                // and pass it to the existing assignment transformer.
                                return [transformExpression({
                                    type: 'AssignmentExpression',
                                    operator: '=',
                                    left: declarator.id,
                                    right: declarator.init,
                                    start: declarator.start,
                                }, clauseInfo)];
                            });
                            return vars.length ? [vars] : []
                        }
                    case 'FunctionDeclaration':
                        return []; // Handled by analysis
                    default:
                        throw new Error(`Unsupported statement type in rule body: ${stmt.type}`);
                }
            }),
        ],
    });
}
