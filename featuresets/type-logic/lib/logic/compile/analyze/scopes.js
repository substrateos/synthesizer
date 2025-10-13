/**
 * A pure, recursive function that performs a top-down traversal, returning a
 * flat array of [key, value] entries for the given subtree's annotations.
 * @param {string} mangledName - The name of the current clause group to process.
 * @param {object} clauseMap - The complete, original map of all clause groups.
 * @param {object} inheritedScope - The scope inherited from the parent.
 * @returns {Array} An array of [{mangledName, scopeMap, shadows}] entries.
 */
function getScopeAnnotations(mangledName, clauseMap, inheritedScope) {
    const clauseGroup = clauseMap[mangledName];
    const name = clauseGroup.name

    // Check for a shadow in the purely inherited scope.
    let shadows = inheritedScope[name] || null;
    if (shadows === mangledName) {
        shadows = null
    }

    // The final scope for this rule includes what it inherited, plus its own children.
    const childrenScope = clauseGroup.children.reduce((acc, childMangledName) => {
        const childGroup = clauseMap[childMangledName];
        acc[childGroup.name] = childGroup.mangledName;
        return acc;
    }, {});
    const finalScopeMap = { ...inheritedScope, ...childrenScope, [name]: mangledName };

    // Create the annotation entry for the current node.
    const selfEntry = { name, mangledName, scopeMap: finalScopeMap, shadows };

    // The scope that our children will inherit includes our own name.
    const scopeForChildren = { ...inheritedScope, [name]: mangledName };

    // Recursively process children and flatten the results.
    const childEntries = clauseGroup.children.flatMap(childMangledName =>
        getScopeAnnotations(childMangledName, clauseMap, scopeForChildren)
    );

    // Return this node's entry plus all its childrens' entries.
    return [selfEntry, ...childEntries];
}

/**
 * Performs the scope resolution pass on the grouped clauseMap.
 */
export default function analyzeScopes(clauseMap) {
    // Find the top-level "root" predicates to start the traversal.
    const topLevelPredicates = Object.values(clauseMap).filter(g => g.parent === null);

    // Build the global scope containing all top-level predicates.
    const globalScope = Object.fromEntries(topLevelPredicates.map(group => [group.name, group.mangledName]))

    const scopeAnnotations = topLevelPredicates.flatMap(predicate =>
        getScopeAnnotations(predicate.mangledName, clauseMap, globalScope)
    );

    const finalClauseMap = {};
    for (const {mangledName, scopeMap, shadows} of scopeAnnotations) {
        finalClauseMap[mangledName] = {
            ...clauseMap[mangledName],
            scopeMap,
            shadows,
        };
    }
    return finalClauseMap;
}