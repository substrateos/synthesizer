/**
 * Creates a clean, serializable copy of an AST node, keeping only essential properties.
 */
export default function trimNode(node) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map(trimNode);

    const essentialProps = {
        Identifier: ['type', 'name', "start", "end"],
        Literal: ['type', 'value', "start", "end"],
        AssignmentExpression: ['type', 'operator', 'left', 'right', "start", "end"],
        AssignmentPattern: ['type', 'left', 'right', "start", "end"],
        CallExpression: ['type', 'callee', 'arguments', "start", "end"],
        ArrayExpression: ['type', 'elements', "start", "end"],
        ObjectExpression: ['type', 'properties', "start", "end"],
        Property: ['type', 'key', 'value', 'kind', "start", "end"],
        UnaryExpression: ['type', 'operator', 'argument', 'prefix', "start", "end"],
        ArrayPattern: ['type', 'elements', "start", "end"],
        ObjectPattern: ['type', 'properties', "start", "end"],
        RestElement: ['type', 'argument', "start", "end"],
    };

    const propsToCopy = essentialProps[node.type] || Object.keys(node);
    const newNode = {};
    for (const prop of propsToCopy) {
        if (Object.hasOwn(node, prop)) {
            newNode[prop] = trimNode(node[prop]);
        }
    }
    return newNode;
}
