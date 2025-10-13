import trimNode from '@/lib/logic/compile/transform/util/trim';

/**
 * Analyzes a BinaryExpression to produce a 'compare' goal IR.
 * @param {object} expr - The BinaryExpression AST node.
 * @returns {object} A 'compare' instruction for the IR.
 */
export default (expr) => {
    return { 
        type: 'compare', 
        op: trimNode(expr) 
    };
};