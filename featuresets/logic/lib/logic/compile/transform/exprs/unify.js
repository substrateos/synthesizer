import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";

export default ({ left, right, startLocation, successExpr=[] }) => {
    if (typeof left !== 'string' || typeof right !== 'string') {
        throw new SyntaxError("both the left and the right of a unify must be simple, immediate expressions")
    }
    const location = JSON.stringify(startLocation)

    return [
        `bindings = unify(${left}, ${right}, bindings, ${location});`,
        ifExpr(`bindings`, [
            `pc++; // Success, continue to the next goal.`,
            `// fallthrough`,
            successExpr,
        ], [
            `// Unification failed.`,
            `yieldValue = { type: 'fail', location: ${location} };`,
            e => e.continue()
        ])
    ];
}