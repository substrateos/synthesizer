import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Parses a `Logic.findall` call expression.
 * @param {object} expr - The CallExpression AST node.
 * @returns {object} A 'findall' instruction for the IR.
 */
export default (expr, context) => {
    if (expr.arguments.length !== 3) {
        throw new Error('Logic.findall requires exactly 3 arguments: Template, Goal, and List.');
    }
    const [template, goal, target] = expr.arguments;
    if (goal.type !== 'CallExpression') {
        throw new Error('The second argument to Logic.findall must be a goal (a function call).');
    }

    // Look up the mangled name for the goal predicate.
    const predName = goal.callee.name;
    const resolverName = context.scopeMap[predName];
    if (!resolverName) {
        throw new Error(`Undefined predicate in Logic.findall: ${predName}`);
    }

    return {
        type: 'findall',
        resolverName,
        template: trimNode(template),
        call: trimNode(goal),
        target: trimNode(target),
    };
};
