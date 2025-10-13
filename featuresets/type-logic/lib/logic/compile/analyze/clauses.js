import mangleName from '@/lib/logic/compile/analyze/util/mangleName';
import visit from '@/lib/logic/compile/analyze/util/visit';

/**
 * A recursive helper to find and process a FunctionDeclaration, creating a clause entry.
 * @param {object} node - The FunctionDeclaration AST node.
 * @param {string[]} parentPath - The lexical path of the parent clause.
 * @param {object} clauses - The clause map being built.
 * @param {string|null} [exportedName=null] - The name used for export, if any.
 */
const processFunction = ({node, clauses, parentPath = [], parentName = null, exportedName = null}) => {
    const name = node.id.name
    const currentPath = [...parentPath, name];
    const mangledName = mangleName(currentPath);

    // If this is the first time we've seen this predicate, create its group.
    if (!clauses[mangledName]) {
        clauses[mangledName] = {
            name,
            path: currentPath,
            mangledName,
            parent: parentName,
            children: [],
            exportedName,
            nodes: [], // Initialize the array for all clause nodes.
        };
    }

    // Add the current function declaration node to the group.
    clauses[mangledName].nodes.push(node);

    // Recurse into the body to find any nested clauses.
    if (node.body && node.body.body) {
        visit(node.body, {
            // Find non-exported nested functions.
            FunctionDeclaration: (childNode) => {
                processFunction({ node: childNode, clauses, parentPath: currentPath, parentName: mangledName });
                return false; // Stop traversal into the child's body.
            },
            // Find exported nested functions.
            ExportNamedDeclaration: (childNode) => {
                if (childNode.declaration && childNode.declaration.type === 'FunctionDeclaration') {
                    processFunction({
                        node: childNode.declaration,
                        clauses,
                        parentPath: currentPath,
                        parentName: mangledName,
                        exportedName: childNode.declaration.id.name
                    });
                }
                return false; // Stop traversal into the child's body.
            },
        });
    }
};

/**
 * Performs the discovery pass on the AST to find all clause definitions.
 * @param {object} ast - The complete program AST.
 * @returns {object} A relational clauseMap.
 */
export default function discoverClauses(ast) {
    const clauseMap = {};

    // 1. Initial Traversal
    visit(ast, {
        FunctionDeclaration: (node) => {
            processFunction({ node, clauses: clauseMap });
            return false;
        },
        ExportNamedDeclaration: (node) => {
            if (node.declaration?.type === 'FunctionDeclaration') {
                processFunction({ node: node.declaration, clauses: clauseMap, exportedName: node.declaration.id.name });
                return false;
            }
        },
    });

    // 2. Relationship Linking
    for (const name in clauseMap) {
        const clause = clauseMap[name];
        if (clause.parent && clauseMap[clause.parent]) {
            // No [0] is needed, as there's now one unified entry per predicate.
            clauseMap[clause.parent].children.push(name);
        }
    }

    return clauseMap;
}