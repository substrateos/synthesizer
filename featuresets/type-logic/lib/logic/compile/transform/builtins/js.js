import jsExpr from "@/lib/logic/compile/transform/exprs/js.js";
import findFreeVariables from "@/lib/logic/compile/transform/util/findFreeVariables.js";

/**
 * Transforms a Logic.js(...) call.
 * This built-in is only valid on the RHS of an assignment.
 * It is a "complex" built-in and returns a full IR array.
 *
 * @param {function} transformExpression - The dependency-injected main expression transformer.
 * @param {object} node - The CallExpression AST node for Logic.js(...).
 * @param {object} context - The transformation context.
 * @returns {Array<object>} The IR goal array.
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.js() can only be used on the right-hand side of an assignment (e.g., Result = Logic.js(...)).");
    }

    const args = node.arguments;
    if (args.length !== 1) {
        throw new Error(`Logic.js() requires exactly 1 argument: Expression.`);
    }
    const [exprNode] = args;

    // 3. Variable analysis (as you pointed out)
    const allFreeVars = findFreeVariables({ ast: exprNode });
    const logicVars = [];
    for (const varName of allFreeVars) {
        const resolution = context.scope.resolveName(varName);
        if (resolution?.type === 'variable') {
            logicVars.push(varName);
        } else if (resolution?.type === 'predicate') {
            throw new Error(
                `Cannot use predicate name '${varName}' directly inside Logic.js().`
            );
        } else {
            // findFreeVariables filters known JS globals.
            // Any other free variable is undeclared in the logic scope.
            throw new Error(
                `Undeclared variable(s) in Logic.js(): ${varName}. ` +
                `Only logic variables from the rule's scope can be used.`
            );
        }
    }

    // Return the jsExpr IR, passing the calculated logicVars
    return jsExpr({
        target: transformExpression(context.lhs, context),
        rawString: context.getRawSource(exprNode),
        logicVars: new Map(logicVars.map(varName => [varName, transformExpression({ type: 'Identifier', name: varName }, context)])),
    });
};
