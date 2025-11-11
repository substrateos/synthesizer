/**
 * Handles Logic.optional() when used as a value.
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.optional() can only be used on the right-hand side of an assignment (e.g., X = Logic.optional(10)).");
    }

    if (node.arguments.length !== 1) {
        throw new Error('Logic.optional() in a value context requires exactly one argument.');
    }
    
    const lhs = transformExpression(context.lhs, {...context, lhs: undefined});
    const rhs = transformExpression(node.arguments[0], context);
    return `Value.optional(${lhs}, ${rhs})`;
};
