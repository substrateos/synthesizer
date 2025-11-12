import referenceExpr from "@/lib/logic/compile/transform/exprs/reference.js";
import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

export default ({ op, startLocation, isRightAlreadyResolved }) => {
    // If the RHS is already resolved by the analyzer (e.g., to a predicate name),
    // we use its value directly as a JS variable.
    // Otherwise, it's a logic term that needs the `referenceExpr()` helper for runtime resolution.
    const rightHandSide = isRightAlreadyResolved ? op.right.name : referenceExpr(op.right);
    return [
        `const location = ${JSON.stringify(startLocation)};`,
        `bindings = unify(${referenceExpr(op.left)}, ${rightHandSide}, bindings, location);`,
        ifExpr(`bindings`, [
            `pc++; // Success, continue to the next goal.`,
            `// fallthrough`
        ], [
            `// Unification failed.`,
            `yieldValue = { type: 'fail', location };`,
            e_else => e_else.continue()
        ])
    ];
}