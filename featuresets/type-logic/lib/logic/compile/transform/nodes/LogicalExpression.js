import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Analyzes a LogicalExpression to produce a 'compare' goal IR.
 * @param {object} expr - The LogicalExpression AST node.
 * @returns {object} A 'compare' instruction for the IR.
 */
export default (expr, context) => {
    return { 
        type: 'compare', 
        op: trimNode(expr),
        startLocation: context.getRawSourceLocation(expr.start),
    };
};