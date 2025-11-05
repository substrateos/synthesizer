import trimNode from "@/lib/logic/compile/transform/util/trim.js";

/**
 * Parses a `Logic.findall` call expression.
 * @param {object} expr - The CallExpression AST node.
 * @param {ClauseInfo} context - The transformation context containing { scope, ... }.
 * @returns {object} A 'findall' instruction for the IR.
 */
export default (expr, context) => {
    // Validate arguments
    if (expr.arguments.length !== 3) {
        throw new Error('Logic.findall requires exactly 3 arguments: Template, Goal, and List.');
    }
    const [template, goal, target] = expr.arguments;
    if (goal.type !== 'CallExpression' || goal.callee.type !== 'Identifier') {
        throw new Error('The second argument to Logic.findall must be a simple predicate call (e.g., myPred(X)).');
    }

    // Resolve Predicate Name
    const predName = goal.callee.name;
    const resolution = context.scope.resolveName(predName);

    // Validate Resolution
    if (!resolution) {
        throw new Error(`Undefined predicate in Logic.findall: ${predName}`);
    }
    if (resolution.type !== 'predicate') {
        throw new Error(`The goal in Logic.findall must be a predicate, not a variable: ${predName}`);
    }

    return {
        type: 'findall',
        resolverName: resolution.definition.mangledName,
        scopeDepth: resolution.scope.depth,
        template: trimNode(template),
        call: trimNode(goal),
        target: trimNode(target),
    };
};
