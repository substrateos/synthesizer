/**
 * Resolves an AST node to its corresponding runtime JavaScript representation.
 * For patterns with spread/rest, it generates `new ArrayPattern(...)` or `new ObjectPattern(...)`.
 */

// Helper to generate the code for a pattern constructor call
function _generatePattern(nodes, isObject) {
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

    for (const node of nodes) {
        if (node.type === 'RestElement' || node.type === 'SpreadElement') {
            pushFixed(); // Push any fixed items before the rest
            partsCode.push(reference(node.argument)); // Push the rest variable (Symbol)
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

    const constructor = isObject ? 'ObjectPattern' : 'ArrayPattern';
    return `new ${constructor}(${partsCode.join(', ')})`;
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
        const hasRest = node.elements.some(el => el.type === 'SpreadElement');
        if (hasRest) {
            return _generatePattern(node.elements, false); // Generate ArrayPattern code
        }
        // No spread, just a plain array literal
        const elements = node.elements.map(reference).join(', ');
        return `[${elements}]`;
    },

    ArrayPattern: (node) => {
        // e.g., function([H, ...T]) {}
        return _generatePattern(node.elements, false); // Generate ArrayPattern code
    },

    ObjectExpression: (node) => {
        // e.g., A = {a: 1, ...Rest}
        const hasRest = node.properties.some(p => p.type === 'SpreadElement');
        if (hasRest) {
            return _generatePattern(node.properties, true); // Generate ObjectPattern code
        }
        // No spread, just a plain object literal
        const props = node.properties.map(prop => {
            const key = prop.key.name || prop.key.value;
            const value = reference(prop.value);
            return `'${key}': ${value}`;
        }).join(', ');
        return `{${props}}`;
    },

    ObjectPattern: (node) => {
        // e.g., function({a: A, ...Rest}) {}
        return _generatePattern(node.properties, true); // Generate ObjectPattern code
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
