/**
 * Extracts specifier details from an ExportNamedDeclaration's `declaration` property.
 * @param {object} declaration - The declaration node.
 * @returns {Array} An array of specifier objects.
 */
function extractSpecifiersFromDeclaration(declaration) {
    if (declaration.declarations) { // `export const a = 1, b = 2`
        return declaration.declarations.map((decl, i) => ({
            localName: decl.id.name,
            exportedName: decl.id.name,
            span: {
                // use the start of `const ...` for the first span
                start: i == 0 ? declaration.start : decl.start,
                end: decl.end,
            },
        }));
    }
    if (declaration.id) { // `export function a() {}`
        return [{
            localName: declaration.id.name,
            exportedName: declaration.id.name,
            span: {start: declaration.start, end: declaration.end},
        }];
    }
    return [];
}

/**
 * Extracts specifier details from an ExportNamedDeclaration's `specifiers` property.
 * @param {Array} specifiers - The array of specifier nodes.
 * @returns {Array} An array of specifier objects.
 */
function extractSpecifiersFromSpecifiers(specifiers) {
    // `export { a, b as c }`
    return specifiers.map(spec => ({
        localName: spec.local.name,
        exportedName: spec.exported.name
    }));
}

/**
 * A map of AST node types to pure handler functions that process them.
 * Each handler returns a structured object or null.
 */
const nodeHandlers = {
    'ExportNamedDeclaration': (node) => {
        const exportData = {
            type: 'named',
            source: node.source ? node.source.value : null,
            specifiers: node.declaration
                ? extractSpecifiersFromDeclaration(node.declaration)
                : extractSpecifiersFromSpecifiers(node.specifiers),
            span: { start: node.start, end: node.end },
        };
        return exportData;
    },
    'ExportDefaultDeclaration': (node) => {
        return {
            type: 'default',
            name: node.declaration.id ? node.declaration.id.name : 'anonymous',
            span: { start: node.start, end: node.end },
        };
    },
    'ExportAllDeclaration': (node) => {
        return {
            type: 'all',
            source: node.source.value,
            span: { start: node.start, end: node.end },
        };
    }
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
