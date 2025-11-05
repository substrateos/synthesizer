import transformFunctionDeclaration from "@/lib/logic/compile/transform/nodes/FunctionDeclaration.js";

/**
 * Creates the IR for the special fallback clause used for shadowing.
 * This represents calling the shadowed (outer) predicate.
 * @param {PredicateDefinition} predicateDef - Definition of the predicate adding the fallback.
 * @returns {object} The IR for the fallback clause.
 */
function createFallbackClause(predicateDef) {
    // Generate a unique mangled name for the fallback clause itself
    const fallbackMangledName = "fallback_" + predicateDef.mangledName;

    return {
        // Properties expected by generateClause
        type: 'rule',
        name: predicateDef.name, // The original predicate name
        mangledName: fallbackMangledName, // Unique ID for this fallback clause
        shadows: null, // The fallback clause itself doesn't shadow
        declaredVars: [], // No new logic variables
        // Body: Call the shadowed predicate
        body: [{
            type: 'subgoal',
            resolverName: predicateDef.shadows, // Mangled name of the predicate we fall back TO
            isLexicalChild: false, // Not a lexically nested call relative to the inner definition
            goalArgs: 'goal', // Special instruction to pass original arguments
            call: {}, // Dummy AST node for signature matching
        }],
    };
}

/**
 * Transforms a PredicateDefinition (from the analysis scope tree) into its IR format.
 * @param {PredicateDefinition} predicateDef - The predicate definition from analyzeScopes.
 * @param {Scope} scope - The parent scope where this predicate was defined (provides context).
 * @returns {object} The final IR object for the predicate { name, mangledName, clauses }.
 */
export default function transformPredicate(predicateDef) {
    // Transform each actual clause defined for this predicate.
    const clauses = predicateDef.clauses.map(clauseInfo => {
        // Pass the clauseInfo (containing node, scope, getRawSource, resolveName)
        // Also pass the predicate's mangledName for context if needed inside.
        return transformFunctionDeclaration(clauseInfo, predicateDef.mangledName);
    });

    // If analysis determined this predicate shadows another one...
    if (predicateDef.shadows) {
        // ...append the special fallback clause IR.
        clauses.push(createFallbackClause(predicateDef));
    }

    // Return the predicate IR structure.
    return {
        name: predicateDef.name,
        mangledName: predicateDef.mangledName,
        clauses, // Array of clause IRs (including fallback if any)
    };
}
