/**
 * Resolves an AST node to its corresponding runtime JavaScript representation.
 * For patterns with spread/rest, it generates `new ArrayPattern(...)` or `new ObjectPattern(...)`.
 */

// Helper to generate the code for a pattern constructor call
function _generatePattern(isObject, nodes) {
    const partsCode = [];
    let currentFixedCode = [];

    // Helper to push the currently gathered fixed items as a single part
    const pushFixed = () => {
        if (currentFixedCode.length === 0) return;
        if (isObject) {
            partsCode.push(`{${currentFixedCode.join(', ')}}`); // Fixed object part
        } else {
            partsCode.push(`[${currentFixedCode.join(', ')}]`); // Fixed array part
        }
        currentFixedCode = [];
    };

    let hasRest = false
    for (const node of nodes) {
        if (node.type === 'RestElement' || node.type === 'SpreadElement') {
            hasRest = true
            pushFixed(); // Push any fixed items before the spread
            partsCode.push(reference(node.argument)); // Push the spread variable (Symbol)
        } else {
            // It's a fixed item
            if (isObject) {
                const key = node.key.name || node.key.value;
                const valueCode = reference(node.value);
                currentFixedCode.push(`'${key}': ${valueCode}`);
            } else {
                currentFixedCode.push(reference(node));
            }
        }
    }
    pushFixed(); // Push any remaining fixed items

    if (hasRest || partsCode.length > 1) {
        if (isObject) {
            return `new ObjectPattern([${partsCode.join(', ')}])`;
        }
        return `ArrayPattern.of(${partsCode.join(', ')})`;
    }
    return partsCode[0] || (isObject ? '{}' : '[]')
}

// Main dispatch object for different AST node types
const nodeTypes = {
    Identifier: (node) => {
        if (node.isResolved) return node.name; // Already resolved (e.g., predicate name)
        if (node.name === '_') return `Symbol('_')`; // Anonymous variable
        return `vars.${node.name}`; // Logic variable
    },

    Literal: (node) => {
        return JSON.stringify(node.value); // Primitives (string, number, boolean, null)
    },

    ArrayExpression: (node) => {
        // e.g., A = [H, ...T] or A = [1, 2]
        return _generatePattern(false, node.elements);
    },

    ArrayPattern: (node) => {
        // e.g., function([H, ...T]) {}
        return _generatePattern(false, node.elements);
    },

    ObjectExpression: (node) => {
        // e.g., A = {a: 1, ...Rest}
        return _generatePattern(true, node.properties);
    },

    ObjectPattern: (node) => {
        // e.g., function({a: A, ...Rest}) {}
        return _generatePattern(true, node.properties);
    },

    AssignmentPattern: (node) => {
        // e.g., function(X=1) {}. We only care about the variable X here.
        return reference(node.left);
    }
};

// The main export function
export default function reference(node) {
    const nodeReference = nodeTypes[node.type];
    if (nodeReference) {
        return nodeReference(node);
    }
    // Rest/Spread elements are handled internally by _generatePattern
    if (node?.type === 'RestElement' || node?.type === 'SpreadElement') {
        throw new Error('RestElement/SpreadElement should be handled by its parent node.');
    }
    // Fallback for unsupported types
    throw new Error(`Unsupported argument AST node type: ${node?.type}`);
}
