import trimNode from "@/lib/logic/compile/transform/util/trim.js";
import transformAssignment from "@/lib/logic/compile/transform/nodes/AssignmentExpression.js";
import transformExpressionStatement from "@/lib/logic/compile/transform/nodes/ExpressionStatement.js";
import transformDebuggerStatement from "@/lib/logic/compile/transform/nodes/DebuggerStatement.js";
import transformVariableDeclaration from "@/lib/logic/compile/transform/nodes/VariableDeclaration.js";

/**
 * Transforms default value assignments in parameters into unification goals.
 * @param {object} param - The AST node for a parameter.
 * @param {ClauseInfo} context - The transformation context (the ClauseInfo object).
 * @returns {Array<object>} An array of IR goal objects.
 */
const getUnificationGoals = (param, context) => {
    if (!param) return [];
    switch (param.type) {
        case 'AssignmentPattern': {
            const assignmentExpr = { type: 'AssignmentExpression', operator: '=', left: param.left, right: param.right };
            const goal = transformAssignment(assignmentExpr, context); // Pass ClauseInfo as context
            return goal ? [goal] : [];
        }
        case 'ArrayPattern':
            return param.elements.flatMap(p => getUnificationGoals(p, context));
        case 'ObjectPattern':
            return param.properties.flatMap(p => (p.type === 'Property' ? getUnificationGoals(p.value, context) : []));
        default:
            return [];
    }
};

/**
 * Transforms the body statements of a clause.
 * @param {ClauseInfo} clauseInfo - Contains astNode, scope, getRawSource.
 * @returns {Array<object>} An array of IR goal objects.
 */
function transformRuleBody(clauseInfo) {
    const context = clauseInfo; // Pass ClauseInfo directly as context
    const astNode = clauseInfo.astNode;
    if (!astNode.body?.body) return [];

    return astNode.body.body.flatMap((stmt, i) => {
        switch (stmt.type) {
            case 'DebuggerStatement':
                if (i === 0) { return [] } // handled in transformFunctionDeclaration
                return transformDebuggerStatement(stmt, context);
            case 'ExpressionStatement':
                return transformExpressionStatement(stmt, context);
            case 'VariableDeclaration':
                return transformVariableDeclaration(stmt, context);
            case 'FunctionDeclaration':
                return []; // Handled by analysis
            default:
                throw new Error(`Unsupported statement type in rule body: ${stmt.type}`);
        }
    });
}

/**
 * Transforms a ClauseInfo object (from analysis) into its final clause IR.
 * @param {ClauseInfo} clauseInfo - Contains astNode, scope, getRawSource.
 * @param {string} predicateMangledName - Mangled name of the parent predicate.
 * @returns {object} The final clause IR for the code generator.
 */
export default function transformFunctionDeclaration(clauseInfo, predicateMangledName) {
    const { astNode, scope } = clauseInfo;

    return {
        type: 'rule',
        name: astNode.id.name,
        declaredVars: [...scope.declaredVariables.keys()],
        body: [
            ...(clauseInfo.astNode?.body?.body?.[0]?.type === 'DebuggerStatement'
                ? [transformDebuggerStatement(clauseInfo.astNode?.body?.body?.[0], clauseInfo)]
                : []
            ),
            {
                type: 'unify',
                isRightAlreadyResolved: true,
                op: {
                    type: 'AssignmentExpression', operator: '=',
                    left: { type: 'ArrayPattern', elements: astNode.params.map(trimNode) },
                    right: { type: 'Identifier', name: 'goal' },
                },
                startLocation: clauseInfo.getRawSourceLocation(astNode.start),
            },
            ...astNode.params.flatMap(p => getUnificationGoals(p, clauseInfo)),
            ...transformRuleBody(clauseInfo),
        ],
    };
}
