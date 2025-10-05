/**
 * A map of AST node types to pure handler functions that process them.
 * Each handler returns a structured object or null.
 */
const nodeHandlers = {
    'ImportDeclaration': (node) => {
        const importData = {
            source: node.source.value,
            specifiers: node.specifiers.map(specifier => {
                if (specifier.type === 'ImportDefaultSpecifier') {
                    return { type: 'default', localName: specifier.local.name };
                }
                if (specifier.type === 'ImportNamespaceSpecifier') {
                    return { type: 'namespace', localName: specifier.local.name };
                }
                return { type: 'named', importedName: specifier.imported.name, localName: specifier.local.name };
            }),
            attributes: (node.attributes || []).map(attribute => ({
                key: attribute.key.name || attribute.key.value,
                value: attribute.value.value
            })),
            span: { start: node.start, end: node.end },
        };
        return importData;
    },
    'ImportExpression': (node) => {
        if (node.source.type === 'Literal') {
            return {
                dynamic: true,
                source: node.source.value,
                specifiers: [],
                attributes: [],
                span: { start: node.start, end: node.end },
            };
        }
        return null; // Handle cases like import(variable)
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
export default function findImports({ast}) {
    const imports = [];

    walk(ast, (node) => {
        const handler = nodeHandlers[node.type];
        if (handler) {
            const data = handler(node);
            if (data) {
                imports.push(data);
            }
        }
    });

    return imports;
}
