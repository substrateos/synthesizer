/**
 * Converts a static AST node into its corresponding JavaScript value.
 * Throws an error if it encounters a non-static part (e.g., a variable).
 * @param {object} node - The Acorn AST node.
 * @returns {any} The JavaScript value.
 */
export default function astNodeToValue({node, onError}) {
    if (!node) {
        return undefined;
    }
    if (!onError) {
        onError = (message) => { throw new Error(message) }
    }

    switch (node.type) {
    case 'Literal':
        return node.value;

    case 'ObjectExpression': {
        const obj = {};
        for (const prop of node.properties) {
            const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
            obj[key] = astNodeToValue({node: prop.value, onError});
        }
        return obj;
    }

    case 'ArrayExpression':
        return node.elements.map(element => astNodeToValue({node: element}, onError));

    case 'TemplateLiteral':
        if (node.expressions.length > 0) {
            return onError('Template literals with expressions are not supported.');
        }
        // For a static template literal, there is only one "quasi" element.
        return node.quasis[0].value.cooked;

    // Handle `null` (which is a Literal) and identifiers like `undefined`.
    case 'Identifier': {
        // Allow common type constructors to be represented as strings.
        const allowedIdentifiers = ['String', 'Number', 'Boolean', 'Object', 'Array', 'Date'];
        if (allowedIdentifiers.includes(node.name)) {
            return node.name; // Represent the identifier as a string.
        }
        if (node.name === 'undefined') {
            return undefined;
        }
        // For any other identifier, it's likely a variable we can't resolve statically.
        return onError(`Non-static identifier found: "${node.name}"`);
    }
    
    // Handle negative numbers like "-10"
    case 'UnaryExpression':
        if (node.operator === '-' && node.argument.type === 'Literal') {
            return -node.argument.value;
        }
        return onError(`Unsupported unary operator: "${node.operator}"`);

    default:
        return onError(`Unsupported AST node type: "${node.type}"`);
    }
}
