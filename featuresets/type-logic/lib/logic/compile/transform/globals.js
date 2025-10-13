import transformBuiltins from '@/lib/logic/compile/transform/globals/Builtins';

/**
 * The main dispatcher for global functions and built-in methods. It detects
 * if an expression is a call to a known global and delegates to the
 * appropriate specialized parser.
 * @param {object} expr - The expression AST node to transform.
 * @param {Set<string>} bodyVars - The set of locally declared variables.
 * @returns {object|null} An IR goal object or null if no match is found.
 */
export default (expr, context) => {
    // Check if it's a namespaced call, e.g., `Builtins.something(...)`
    if (expr.callee.type === 'MemberExpression') {
        const namespace = expr.callee.object.name;
        if (namespace === 'Builtins') {
            return transformBuiltins(expr, context);
        }
    }
};
