const nodeTypes = {
    Identifier: (node) => {
        if (node.isResolved) return node.name;
        if (node.name === '_') return `Symbol('_')`;
        return `vars.${node.name}`;
    },

    Literal: (node) => {
        return JSON.stringify(node.value);
    },

    ArrayExpression: (node) => {
        const elements = node.elements.map(reference).join(', ');
        return `[${elements}]`;
    },

    ArrayPattern: (node) => {
        const lastElement = node.elements[node.elements.length - 1];
        const hasRest = lastElement?.type === 'RestElement';

        if (!hasRest) {
            const elements = node.elements.map(reference).join(', ');
            return `[${elements}]`;
        }

        const headElements = node.elements.slice(0, -1);
        const tailElement = lastElement.argument;

        return `new ArrayPattern([${headElements.map(reference).join(', ')}], ${reference(tailElement)})`;;
    },

    ObjectExpression: (node) => {
        const props = node.properties.map(prop => {
            const key = prop.key.name || prop.key.value;
            const value = reference(prop.value);
            return `'${key}': ${value}`;
        }).join(', ');
        return `{${props}}`;
    },

    ObjectPattern: (node) => {
        const props = node.properties.map(prop => {
            const key = prop.key.name || prop.key.value;
            const value = reference(prop.value);
            return `'${key}': ${value}`;
        }).join(', ');

        return `new ObjectPattern({${props}})`
    },

    AssignmentPattern: (node) => {
        return reference(node.left);
    }
};

export default function reference(node) {
    const nodeReference = nodeTypes[node.type];
    if (nodeReference) {
        return nodeReference(node);
    }
    // The RestElement is handled inside ArrayPattern, it's not a top-level argument.
    if (node?.type === 'RestElement') {
        throw new Error('RestElement should be handled by its parent ArrayPattern.');
    }
    throw new Error(`Unsupported argument AST node type: ${node?.type}`);
}