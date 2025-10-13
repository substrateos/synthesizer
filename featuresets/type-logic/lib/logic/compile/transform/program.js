import transformPredicate from '@/lib/logic/compile/transform/predicate';

/**
 * Transforms the fully annotated clauseMap into the final IR for codegen.
 * @param {object} annotatedClauseMap - The output from the analysis pass.
 * @returns {object} The final `predicates` object for the code generator.
 */
export default function transformProgram(annotatedClauseMap) {
    const predicates = {};
    for (const mangledName in annotatedClauseMap) {
        const clauseGroup = annotatedClauseMap[mangledName];
        predicates[mangledName] = transformPredicate(clauseGroup);
    }
    return predicates;
}