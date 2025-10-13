import trimNode from '@/lib/logic/compile/transform/util/trim';

export default function transformAssignmentExpression(expr, context) {
    const { scopeMap } = context;

    if (expr.right.type === 'CallExpression' && expr.right.callee.name === 'Number') {
        return {
            type: 'js',
            target: trimNode(expr.left),
            expr: trimNode(expr.right.arguments[0]),
        };
    }

    if (expr.right.type === 'Identifier' && scopeMap[expr.right.name]) {
        const op = trimNode(expr);
        op.right = { type: 'Identifier', name: `${scopeMap[expr.right.name]}.bind(null, { vars, bindings })` };
        return { type: 'unify', op, isRightAlreadyResolved: true };
    }

    return { type: 'unify', op: trimNode(expr) };
}