import transformFunctionDeclaration from '@/lib/logic/compile/transform/nodes/FunctionDeclaration';

/**
 * Creates the IR for the special, arity-agnostic fallback clause.
 * This clause is "headless" and its body contains a single `subgoal` op.
 */
function createFallbackClause(name, shadowedName) {
    return {
        name: name,
        declaredVars: [],
        body: [{
            type: 'subgoal',
            resolverName: shadowedName,
            isLexicalChild: false,
            goalArgs: 'goal', // Special instruction to pass the original `goal` array through.
            call: {}, // Dummy object to satisfy the op's signature.
        }],
    };
}

/**
 * Transforms a single predicate's clause group into its final IR.
 * @param {object} clauseGroup - The clause group from the analysis pass.
 * @returns {object} The final IR object for the predicate.
 */
export default function transformPredicate(clauseGroup) {
    // Transform all the real, AST-based clauses.
    const clauseIRs = clauseGroup.nodes.map(node => {
        const singleClauseAnnotation = { ...clauseGroup, node };
        return transformFunctionDeclaration(singleClauseAnnotation);
    });

    // If this predicate shadows a global one, create and add the fallback clause.
    if (clauseGroup.shadows) {
        clauseIRs.push(createFallbackClause(clauseGroup.name, clauseGroup.shadows));
    }

    return {
        name: clauseGroup.name,
        clauses: clauseIRs,
    };
}