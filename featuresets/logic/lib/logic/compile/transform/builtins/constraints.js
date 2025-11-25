import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

/**
 * Handles Logic.constraints(Var)
 * Returns a code string that evaluates to the list of constraints.
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.constraints() can only be used on the right-hand side of an assignment (e.g., List = Logic.constraints(Var)).");
    }

    if (node.arguments.length !== 1) {
        throw new Error('Logic.constraints/1 requires exactly 1 argument: Term.');
    }
    const [term] = node.arguments;

    // Return code that calls the runtime helper.
    // The 'valueExpr' ensures we pass the underlying Symbol (or value) from the bindings.
    return `unify.constraints(${valueExpr(transformExpression(term, context), 'bindings')}, bindings)`;
};
