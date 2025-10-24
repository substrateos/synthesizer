import trimNode from '@/lib/logic/compile/transform/util/trim';
import transformAssignment from '@/lib/logic/compile/transform/nodes/AssignmentExpression';
import transformExpressionStatement from '@/lib/logic/compile/transform/nodes/ExpressionStatement';
import transformVariableDeclaration from '@/lib/logic/compile/transform/nodes/VariableDeclaration';
import visit from '@/lib/logic/compile/analyze/util/visit';

/**
 * Finds all variables declared in a clause's head or with `var`.
 * @param {object} node - The FunctionDeclaration AST node for the clause.
 * @returns {Set<string>} A set of locally declared variable names.
 */
const findDeclaredVars = (node) => {
    const declaredVars = new Set();
    if (node.type === 'FunctionDeclaration') {
        // Find variables in the rule head (parameters)
        const collectFromPattern = (pattern) => {
            if (!pattern) return;
            if (pattern.type === 'Identifier') declaredVars.add(pattern.name);
            else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(collectFromPattern);
            else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(p => {
                collectFromPattern(p.value)
                collectFromPattern(p) // to walk RestElement, if any
            });
            else if (pattern.type === 'Property') collectFromPattern(pattern.argument);
            else if (pattern.type === 'RestElement') collectFromPattern(pattern.argument);
            else if (pattern.type === 'AssignmentPattern') collectFromPattern(pattern.left);
        };
        node.params.forEach(collectFromPattern);

        // Find variables in the rule body (`var` declarations)
        visit(node.body, {
            VariableDeclarator(decl) {
                collectFromPattern(decl.id)
            }
        });
    }
    return declaredVars;
};

/**
 * A recursive helper to find and transform all default value assignments
 * into unification goals.
 */
const getUnificationGoals = (param, context) => {
    if (!param) {
        return [];
    }
    switch (param.type) {
        case 'AssignmentPattern': {
            const assignmentExpr = {
                type: 'AssignmentExpression', operator: '=',
                left: param.left, right: param.right,
            };
            const goal = transformAssignment(assignmentExpr, context);
            return goal ? [goal] : [];
        }
        case 'ArrayPattern':
            return param.elements.flatMap(p => getUnificationGoals(p, context));
        case 'ObjectPattern':
            return param.properties.flatMap(p => getUnificationGoals(p.value, context));
        default:
            return [];
    }
};

function transformRuleBody(clause, allVisibleVars) {
    const context = { ...clause, allVisibleVars };

    return clause.node.body.body.flatMap(stmt => {
        switch (stmt.type) {
            case 'ExpressionStatement':
                return transformExpressionStatement(stmt, context);
            case 'VariableDeclaration':
                return transformVariableDeclaration(stmt, context);
            case 'FunctionDeclaration':
                // Handled by the analysis pass and ignored here.
                return [];
            default:
                throw new Error(`Unsupported statement type in rule body: ${stmt.type}`);
        }
    });
}

/**
 * Transforms an annotated FunctionDeclaration clause into its final clause IR.
 * @param {object} clause - A single clause from the annotatedClauseMap, containing a single .node
 * @returns {object} The final clause IR for the code generator.
 */
export default function transformFunctionDeclaration(clause) {
    // --- Variable Analysis ---
    const declaredVars = findDeclaredVars(clause.node);
    const allVisibleVars = new Set(clause.parentVisibleVars || []);
    declaredVars.forEach(v => allVisibleVars.add(v));

    // --- Transformation ---
    const unificationGoals = clause.node.params.flatMap(p => getUnificationGoals(p, clause));

    // Create the head unification goal as the first op in the body.
    const headUnificationOp = {
        type: 'unify',
        isRightAlreadyResolved: true,
        op: {
            type: 'AssignmentExpression',
            operator: '=',
            left: { type: 'ArrayPattern', elements: clause.node.params.map(trimNode) },
            right: { type: 'Identifier', name: 'goal' },
        },
    };

    const bodyGoals = transformRuleBody(clause, allVisibleVars);

    return {
        type: 'rule',
        name: clause.path[clause.path.length - 1],
        mangledName: clause.mangledName,
        parent: clause.parent,
        shadows: clause.shadows,
        body: [headUnificationOp, ...unificationGoals, ...bodyGoals],
        visibleVars: [...allVisibleVars],
        declaredVars: [...declaredVars],
    };
}