import transformPredicate from '@/lib/logic/compile/transform/predicate';

/**
 * Recursively walks the scope tree and returns a flat list of Predicate IRs
 * found within the given scope and its descendants (functional style).
 * @param {Scope} scope - The current scope object.
 * @returns {Array<object>} A flat list of predicateIR objects.
 */
function extractPredicates(scope) {
    return [
        // Transform predicates declared directly in this scope
        ...Array.from(scope.declaredPredicates.values(), predicateDef => transformPredicate(predicateDef, scope)),
        // Recursively extract predicates from nested scopes within clauses
        ...Array.from(scope.declaredPredicates.values())
            .flatMap(predicateDef => predicateDef.clauses.flatMap(clauseInfo => extractPredicates(clauseInfo.scope))),
    ]
}

/**
 * Transforms the scope tree into the final flat `predicates` object keyed by mangledName.
 * @param {Scope} topLevelScope - The output from the analysis pass.
 * @returns {object} The final `predicates` object keyed by mangledName.
 */
export default function transformProgram(topLevelScope) {
    // Get the flat list of predicate IRs using the functional helper
    const predicateIRs = extractPredicates(topLevelScope);

    // Convert the list to an object keyed by mangledName
    const predicateTable = {};
    for (const predicateIR of predicateIRs) {
        if (predicateTable[predicateIR.mangledName]) {
             console.warn(`Duplicate mangledName encountered during transformProgram: ${predicateIR.mangledName}`);
        }
        predicateTable[predicateIR.mangledName] = predicateIR;
    }
    return predicateTable;
}
