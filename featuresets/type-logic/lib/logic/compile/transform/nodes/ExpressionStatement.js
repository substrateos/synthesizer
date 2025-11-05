import CallExpression from "@/lib/logic/compile/transform/nodes/CallExpression.js";
import AssignmentExpression from "@/lib/logic/compile/transform/nodes/AssignmentExpression.js";
import UnaryExpression from "@/lib/logic/compile/transform/nodes/UnaryExpression.js";
import BinaryExpression from "@/lib/logic/compile/transform/nodes/BinaryExpression.js";
import LogicalExpression from "@/lib/logic/compile/transform/nodes/LogicalExpression.js";

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