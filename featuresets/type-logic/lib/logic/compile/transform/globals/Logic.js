import findall from '@/lib/logic/compile/transform/builtins/findall';

/**
 * A dispatch table for methods on the `Logic` object.
 */
const Logic = {
    findall,
};

/**
 * Parses a call to a method on the `Logic` object (e.g., `Logic.findall(...)`).
 * @param {object} expr - The CallExpression AST node.
 * @param {Set<string>} bodyVars - The set of variables declared locally in the rule's body.
 * @returns {object|null} A goal object for the IR, or null if no matching parser is found.
 */
export default (expr, context) => {
    const builtinName = expr.callee.property.name;
    const parser = Logic[builtinName];
    if (parser) {
        return parser(expr, context);
    }
    return null;
}
