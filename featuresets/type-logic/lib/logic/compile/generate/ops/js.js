import value from '@/lib/logic/compile/generate/blocks/value';

/**
 * Recursively builds a JS expression string from an AST for computation,
 * correctly resolving all logic variables to their values.
 */
function jsExpression(node) {
    if (node.type === 'BinaryExpression') {
        return `(${jsExpression(node.left)} ${node.operator} ${jsExpression(node.right)})`;
    }
    return value(node, 'bindings'); // Any identifier or literal is resolved to its value.
}

export default ({ target, expr }) => `
// Evaluate the provided expression.
const computedValue = ${jsExpression(expr)};
bindings = unify(${value(target, 'bindings')}, computedValue, bindings, location);
if (bindings) {
    pc++; // Success, continue to the next goal.
    // fallthrough
} else {
    // Unification with the computed value failed.
    yieldValue = { type: 'fail' };
    continue;
}
`;