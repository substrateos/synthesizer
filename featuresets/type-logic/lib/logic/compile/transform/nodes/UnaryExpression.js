import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Analyzes a UnaryExpression to produce a 'negation' goal IR.
 * @param {object} expr - The UnaryExpression AST node.
 * @param {ClauseInfo} context - The transformation context containing { scope, ... }.
 * @returns {object|null} A 'negation' instruction for the IR, or null if not applicable.
 */
export default (expr, context) => {
    // Check Operator
    if (expr.operator !== '!') {
        return null;
    }

    // Check Argument Type
    const goal = expr.argument;
    if (goal.type !== 'CallExpression' || goal.callee.type !== 'Identifier') {
        throw new Error('Negation operator (!) can only be applied directly to a simple predicate call (e.g., !myPred(X)).');
    }

    // Resolve Predicate Name
    const predName = goal.callee.name;
    const resolution = context.scope.resolveName(predName);

    // Validate Resolution
    if (!resolution) {
        throw new Error(`Undefined predicate used in negation: ${predName}`);
    }
    if (resolution.type !== 'predicate') {
        throw new Error(`Cannot apply negation operator (!) to a variable: ${predName}`);
    }

    // 6. Return IR
    return {
        type: 'negation',
        resolverName: resolution.definition.mangledName,
        scopeDepth: resolution.scope.depth,
        goal: trimNode(goal),
    };
};