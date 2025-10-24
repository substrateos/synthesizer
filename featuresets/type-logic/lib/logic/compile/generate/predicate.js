import generateClause from '@/lib/logic/compile/generate/clause';

/**
 * Generates the unified resolver for a predicate.
 * @param {string} mangledName - The unique name for the resolver function.
 * @param {object} predicateIR - The IR object for the predicate, containing clauses and fallback info.
 */
export default function generatePredicateResolver(mangledName, predicateIR) {
    const { name, clauses, fallback } = predicateIR;

    // Generate the code for all the normal, local clauses.
    let allCases = clauses.map((clause, clauseId) => {
        const clauseCode = generateClause(clause, clauseId);
        return `
    case ${clauseId}: {
        ${clauseCode}
        break;
    }`;
    }).join('');

    // Each clause (plus the optional fallback) will be a choice point for the solver.
    const forksArray = `${JSON.stringify(clauses.map((_, i) => ({ resume: { clauseId: i } })))}`;

    return `
/**
 * Transpiled resolver for the '${name}' predicate.
 */
function* ${mangledName}(scope, ...goal) {
    // define these at the outer scope for easier debugging
    let yieldValue;

    yieldValue = {type: 'fork', forks: ${forksArray}};
    
    while (true) {
        const step = yield yieldValue;
        let { pc, oppc } = step.resume ?? {};
        yieldValue = undefined; // reset

        // The logic for handling sub-goal results is now inside the clause generators.
        switch (step.resume?.clauseId) {
            ${allCases}
            default: {
                yieldValue = {type: 'fail'}
                break
            }
        }
    }
}
${mangledName}[nameTag] = '${name}';
${mangledName}.bind = (() => {
    const originalBind = ${mangledName}.bind;
    const newBind = function (...bindArgs) {
        const fn = originalBind.apply(this, bindArgs)
        for (const tag of resolverTags) {
            if (tag in this) {
                fn[tag] = this[tag]
            }
        }
        fn.bind = newBind
        return fn
    }
    return newBind
})();
`;
}