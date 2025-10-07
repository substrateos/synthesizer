/**
 * A map of AST node types to pure handler functions that process them.
 * Each handler returns a structured object or null.
 */
const nodeHandlers = {
    'ExportDefaultDeclaration': (node) => {
        return {
            type: 'default',
            name: node.declaration.name ?? (node.declaration.id ? node.declaration.id.name : 'anonymous'),
            span: { start: node.start, end: node.end },
        };
    },
};

function walk(node, callback) {
    if (!node) return;
    callback(node);
    for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
            const child = node[key];
            if (typeof child === 'object' && child !== null) {
                if (Array.isArray(child)) {
                    child.forEach(item => walk(item, callback));
                } else {
                    walk(child, callback);
                }
            }
        }
    }
}

/**
 * Parses a string of JavaScript code to extract import and export statements.
 * @param {string} code The JavaScript code to parse.
 * @returns {object} An object containing arrays of `imports` and `exports`.
 */
export default function findExports({ast}) {
    const exports = []

    walk(ast, (node) => {
        const handler = nodeHandlers[node.type];
        if (handler) {
            const data = handler(node);
            if (data) {
                exports.push(data);
            }
        }
    });

    return exports;
}
