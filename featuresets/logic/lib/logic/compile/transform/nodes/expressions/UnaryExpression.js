import negationExpr from "@/lib/logic/compile/transform/exprs/negation.js";
import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

/**
 * Transforms UnaryExpressions.
 * Supports:
 * 1. Negation (!): !goal()
 * 2. Typeof (typeof): typeof Variable
 */
export default (transformExpression, node, context) => {
    // Negation (!)
    if (node.operator === '!') {
        const goal = node.argument;
        if (goal.type !== 'CallExpression' || goal.callee.type !== 'Identifier') {
            throw new Error('Negation operator (!) can only be applied directly to a simple predicate call (e.g., !myPred(X)).');
        }

        const predName = goal.callee.name;
        const resolution = context.scope.resolveName(predName);

        if (!resolution || resolution.type !== 'predicate') {
            throw new Error(`Invalid negation target: ${predName}`);
        }

        return negationExpr({
            resolverName: resolution.definition.mangledName,
            scopeDepth: resolution.scope.depth,
            goal: goal.arguments.map(argNode => transformExpression(argNode, context)),
        });
    }

    // Typeof
    if (node.operator === 'typeof') {
        const arg = transformExpression(node.argument, context)
        if (typeof arg !== 'string') {
            throw new Error('typeof can only be applied to simple expressions')
        }
        // We resolve the argument to its value, then apply the JS typeof operator at runtime.
        // This returns a string literal (e.g., "function", "object") which can be unified.
        // Example: typeof X === 'function'
        return `typeof ${valueExpr(arg, 'bindings')}`;
    }

    return null;
};