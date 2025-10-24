import trimNode from '@/lib/logic/compile/transform/util/trim';

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

    return {
        type: 'is_ground',
        term: trimNode(term),
    };
};
