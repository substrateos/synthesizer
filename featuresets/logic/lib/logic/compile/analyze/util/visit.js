/**
 * A generic AST traversal utility.
 * @param {object} node The AST node to start from.
 * @param {object} visitors An object mapping AST node types to handler functions.
 */
export default function visit(node, visitors) {
    if (!node) return;
    let visitor = visitors[node.type];
    if (visitor && visitor(node) === false) {
        return; // Visitor can return false to stop traversal of children.
    }

    for (const key in node) {
        if (key === 'loc' || key === 'range') continue;
        const prop = node[key];
        if (Array.isArray(prop)) {
            prop.forEach(child => {
                if (child && typeof child.type === 'string') visit(child, visitors);
            });
        } else if (prop && typeof prop.type === 'string') {
            visit(prop, visitors);
        }
    }
}
