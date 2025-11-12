import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

/**
 * Parses a `Logic.is_ground` call expression.
 * @param {object} expr - The CallExpression AST node.
 * @returns {object} An 'is_ground' instruction for the IR.
 */
export default (expr, context) => {
    if (expr.arguments.length !== 1) {
        throw new Error('Logic.is_ground/1 requires exactly 1 argument: Term.');
    }
    const [term] = expr.arguments;

    let negated = false

    return ifExpr(`${negated ? '!' : ''}unify.isGround(${valueExpr(term, 'bindings')})`, [
        `pc++; // is_ground is true, succeed and continue.`,
        `// fallthrough`,
    ], [
        `// is_ground is false, fail this clause.`,
        `yieldValue = { type: 'fail' };`,
        e_else => e_else.continue(),
    ])
};
