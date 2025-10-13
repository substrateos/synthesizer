import CallExpression from '@/lib/logic/compile/transform/nodes/CallExpression';
import AssignmentExpression from '@/lib/logic/compile/transform/nodes/AssignmentExpression';
import UnaryExpression from '@/lib/logic/compile/transform/nodes/UnaryExpression';
import BinaryExpression from '@/lib/logic/compile/transform/nodes/BinaryExpression';
import LogicalExpression from '@/lib/logic/compile/transform/nodes/LogicalExpression';

const goalTransformers = {
    CallExpression,
    AssignmentExpression,
    UnaryExpression,
    BinaryExpression,
    LogicalExpression,
};

export default function transformExpressionStatement(stmt, context) {
    const expr = stmt.expression;
    return goalTransformers[expr.type]?.(expr, context);
}