import visit from "@/lib/logic/compile/analyze/util/visit.js";

/**
 * Finds all variables declared in a clause's head or with `var` and maps them to their declaration AST node.
 * @param {object} funcNode - The FunctionDeclaration AST node for the clause.
 * @returns {Map<string, object>} A map from variable name to the AST node (Identifier/Pattern) where it's declared.
 */
export default (funcNode) => {
    const declaredVarsMap = new Map();
    if (!funcNode || funcNode.type !== 'FunctionDeclaration') {
        return declaredVarsMap;
    }

    // Helper to add declarations from patterns
    const collectFromPattern = (patternNode) => {
        if (!patternNode) return;
        switch (patternNode.type) {
            case 'Identifier':
                // Map the name to the Identifier node itself
                if (!declaredVarsMap.has(patternNode.name)) { // Avoid overwriting if declared multiple times (e.g., param and var)
                    declaredVarsMap.set(patternNode.name, patternNode);
                }
                break;
            case 'ArrayPattern':
                patternNode.elements.forEach(collectFromPattern);
                break;
            case 'ObjectPattern':
                patternNode.properties.forEach(p => {
                    if (p.type === 'Property') {
                        // For { key: value }, the binding is in the value
                        collectFromPattern(p.value);
                    } else if (p.type === 'RestElement') {
                        // For { ...rest }, the binding is the argument
                        collectFromPattern(p.argument);
                    }
                });
                break;
            case 'RestElement':
                // For [ ...rest ], the binding is the argument
                collectFromPattern(patternNode.argument);
                break;
            case 'AssignmentPattern':
                // For [x=1] or {x=1}, the binding is on the left
                collectFromPattern(patternNode.left);
                break;
        }
    };

    // Process parameters
    funcNode.params.forEach(collectFromPattern);

    // Process 'var' declarations in the body
    visit(funcNode.body, {
        VariableDeclarator(declNode) {
            // Check if it's a 'var' declaration (though our language only supports var effectively)
            // let kind = 'var'; // Assuming 'var' for simplicity
            // find ancestor VariableDeclaration? More robust, but complex.
            // For now, assume all VariableDeclarators inside functions are effectively 'var'.
            collectFromPattern(declNode.id); // declNode.id is the pattern (Identifier, ObjectPattern, etc.)
        }
    });

    return declaredVarsMap;
};
