import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Parses a `Builtins.findall` call expression.
 * @param {object} expr - The CallExpression AST node.
 * @returns {object} A 'findall' instruction for the IR.
 */
export default (expr, context) => {
    if (expr.arguments.length !== 3) {
        throw new Error('Builtins.findall requires exactly 3 arguments: Template, Goal, and List.');
    }
    const [template, goal, target] = expr.arguments;
    if (goal.type !== 'CallExpression') {
        throw new Error('The second argument to Builtins.findall must be a goal (a function call).');
    }

    // Look up the mangled name for the goal predicate.
    const predName = goal.callee.name;
    const resolverName = context.scopeMap[predName];
    if (!resolverName) {
        throw new Error(`Undefined predicate in Builtins.findall: ${predName}`);
    }

    return {
        type: 'findall',
        resolverName,
        template: trimNode(template),
        call: trimNode(goal),
        target: trimNode(target),
    };
};
