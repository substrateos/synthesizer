import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

// op is BinaryExpression or LogicalExpression
export default ({left, right, operator, startLocation}) => {
    return [
        `const left = ${valueExpr(left, 'bindings')};`,
        `const right = ${valueExpr(right, 'bindings')};`,
        ifExpr(`(left ${operator} right)`, [
            `pc++; // Comparison is true`,
            `// fallthrough`,
        ], [
            `yieldValue = { type: 'fail', location: ${JSON.stringify(startLocation)} };`,
            e_else => e_else.continue()
        ]),
    ]
}
