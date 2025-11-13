import findall from "@/lib/logic/compile/transform/builtins/findall.js";
import optional from "@/lib/logic/compile/transform/builtins/optional.js";
import is_ground from "@/lib/logic/compile/transform/builtins/is_ground.js";
import js from "@/lib/logic/compile/transform/builtins/js.js";

/**
 * A dispatch table for methods on the `Logic` object.
 */
const Logic = {
    findall,
    optional,
    is_ground,
    js,
};

/**
 * Parses a call to a method on the `Logic` object (e.g., `Logic.findall(...)`).
 * @param {function} transformExpression - The dependency-injected main expression transformer.
 * @param {object} node - The CallExpression AST node.
 * @param {Set<string>} bodyVars - The set of variables declared locally in the rule's body.
 * @returns {object|null} A goal object for the IR, or null if no matching parser is found.
 */
export default (transformExpression, node, context) => {
    const builtinName = node.callee.property.name;
    const parser = Logic[builtinName];
    if (parser) {
        return parser(transformExpression, node, context);
    }
    return null;
}
