import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

// op is BinaryExpression or LogicalExpression
export default (op, context) => {
    const startLocation = context.getRawSourceLocation(op.start)

    return [
        `const location = ${JSON.stringify(startLocation)};`,
        `const left = ${valueExpr(op.left, 'bindings')};`,
        `const right = ${valueExpr(op.right, 'bindings')};`,
        ifExpr(`(left ${op.operator} right)`, [
            `pc++; // Comparison is true`,
            `// fallthrough`,
        ], [
            `yieldValue = { type: 'fail', location };`,
            e_else => e_else.continue()
        ]),
    ]
}
