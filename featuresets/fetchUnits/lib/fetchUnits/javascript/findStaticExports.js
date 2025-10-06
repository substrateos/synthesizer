/**
 * Finds the 'attributes' export declaration node in the AST.
 * @param {object} ast - The Acorn AST.
 * @returns {object|null} The AST node for the value, or null.
 */
export default function findStaticExports({ast}) {
    const constNodes = {}
    let defaultNode
    for (const node of ast.body) {
        if (node.type === 'ExportNamedDeclaration' && node.declaration) {
            const declaration = node.declaration;
            if (declaration.type === 'VariableDeclaration' && declaration.kind === 'const') {
                const declarator = declaration.declarations.find(
                    d => d.id.type === 'Identifier'
                );
                if (declarator) {
                    constNodes[declarator.id.name] = declarator.init; // This is the node for the RHS value
                }
            }
        }
        if (node.type === 'ExportDefaultDeclaration') {
            // The declaration itself is the value node for default exports
            defaultNode = node.declaration;
        }
    }
    return {
        consts: constNodes,
        default: defaultNode,
    }
}
