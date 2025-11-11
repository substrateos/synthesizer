export default function findDeclaredFunctions(astNode) {
    const childFunctions = [];
    const body = astNode.type === 'Program' ? astNode.body : astNode?.body?.body;
    if (body) {
        body.forEach(statement => {
            let funcNode = null;
            if (statement.type === 'FunctionDeclaration') {
                funcNode = statement;
            } else if (statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'FunctionDeclaration') {
                funcNode = statement.declaration;
            }
            if (funcNode) {
                childFunctions.push(funcNode);
            }
        });
    }
    return childFunctions
}