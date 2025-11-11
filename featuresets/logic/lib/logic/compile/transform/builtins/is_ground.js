import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

/**
 * @param {function} transformExpression - The dependency-injected main expression transformer.
 * @param {object} node - The CallExpression AST node for Logic.is_ground(...).
 * @param {object} context - The transformation context.
 * @returns {string} The JavaScript call string (e.g., "unify.isGround(...)").
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.is_ground() can only be used on the right-hand side of an assignment (e.g., Result = Logic.is_ground(Term)).");
    }
    
    if (node.arguments.length !== 1) {
        throw new Error('Logic.is_ground/1 requires exactly 1 argument: Term.');
    }
    const [term] = node.arguments;

    return `unify.isGround(${valueExpr(transformExpression(term, context), 'bindings')})`;
};
