import predicateExpr from "@/lib/logic/compile/transform/exprs/predicate.js";
import Emitter from "@/lib/logic/compile/transform/Emitter.js";

/**
 * Recursively walks the scope tree and returns a flat list of Predicate IRs
 * found within the given scope and its descendants (functional style).
 * @param {Scope} scope - The current scope object.
 * @returns {Array<object>} A flat list of predicateIR objects.
 */
function extractPredicates(scope) {
    return [
        // Transform predicates declared directly in this scope
        ...Array.from(scope.declaredPredicates.values(), predicateDef => predicateExpr(predicateDef, scope)),

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
export default (topLevelScope) => {
    const resolvers = Emitter.from(extractPredicates(topLevelScope))

    const databaseEntries = [...topLevelScope.declaredPredicates.values()]
        .map(clause => `${clause.name}: ${clause.mangledName}.bind(null, null)`)
        .join(',\n        ');

    return `(function(utils) {
    const { unify, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern, Value, _ } = utils;

    ${resolvers}

    // --- The Public API Object ---
    const database = {
        ${databaseEntries}
    };

    return database;
})`
}
