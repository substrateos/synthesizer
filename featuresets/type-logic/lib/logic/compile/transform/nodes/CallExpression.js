import trimNode from '@/lib/logic/compile/transform/util/trim';
import transformGlobals from '@/lib/logic/compile/transform/globals';

export default function transformCallExpression(node, context) {
    const { scopeMap, allVisibleVars } = context;

    const globalGoal = transformGlobals(node, context);
    if (globalGoal) {
        return globalGoal;
    }

    const predName = node.callee.name;
    if (allVisibleVars.has(predName)) {
        return { type: 'subgoal', call: trimNode(node), isDynamic: true };
    }

    const mangledName = scopeMap[predName];
    if (!mangledName) {
        throw new Error(`Undefined predicate: ${predName}`);
    }

    const isLexicalChild = context.children?.includes(mangledName);

    return { type: 'subgoal', call: trimNode(node), resolverName: mangledName, isLexicalChild };
}