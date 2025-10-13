import generateSubgoalBlock from '@/lib/logic/compile/generate/blocks/subgoal';

export default (subgoal, clauseId, pc) => {
    const resumeTokenProperties = `clauseId: ${clauseId}, bindings, vars`;
    return generateSubgoalBlock(subgoal, resumeTokenProperties, pc);
};