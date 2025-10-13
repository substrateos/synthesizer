import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Analyzes a UnaryExpression to produce a 'negation' goal IR.
 * @param {object} expr - The UnaryExpression AST node.
 * @param {object} context - The transformer context, containing the scopeMap.
 * @returns {object} A 'negation' instruction for the IR.
 */
export default (expr, context) => {
    if (expr.operator !== '!') {
        return null; // We only handle the negation operator.
    }
    const goal = expr.argument;
    if (goal.type !== 'CallExpression') {
        throw new Error('Negation operator (!) can only be applied to a goal (a function call).');
    }

    // Look up the mangled name for the negated predicate.
    const predName = goal.callee.name;
    const resolverName = context.scopeMap[predName];
    if (!resolverName) {
        throw new Error(`Undefined predicate in negation: ${predName}`);
    }

    return {
        type: 'negation',
        resolverName,
        goal: trimNode(goal)
    };
};