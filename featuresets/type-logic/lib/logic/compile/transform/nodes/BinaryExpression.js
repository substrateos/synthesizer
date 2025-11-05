import trimNode from "@/lib/logic/compile/transform/util/trim.js";

/**
 * Analyzes a BinaryExpression to produce a 'compare' goal IR.
 * @param {object} expr - The BinaryExpression AST node.
 * @returns {object} A 'compare' instruction for the IR.
 */
export default (expr, context) => {
    return { 
        type: 'compare', 
        op: trimNode(expr),
        startLocation: context.getRawSourceLocation(expr.start),
    };
};