import negationExpr from "@/lib/logic/compile/transform/exprs/negation.js";

/**
 * Analyzes a UnaryExpression to produce a 'negation' goal IR.
 * @param {function} transformExpression - The dependency-injected main expression transformer.
 * @param {object} node - The UnaryExpression AST node.
 * @param {ClauseInfo} context - The transformation context containing { scope, ... }.
 * @returns {object|null} A 'negation' instruction for the IR, or null if not applicable.
 */
export default (transformExpression, node, context) => {
    // Check Operator
    if (node.operator !== '!') {
        return null;
    }

    // Check Argument Type
    const goal = node.argument;
    if (goal.type !== 'CallExpression' || goal.callee.type !== 'Identifier') {
        throw new Error('Negation operator (!) can only be applied directly to a simple predicate call (e.g., !myPred(X)).');
    }

    // Resolve Predicate Name
    const predName = goal.callee.name;
    const resolution = context.scope.resolveName(predName);

    // Validate Resolution
    if (!resolution) {
        throw new Error(`Undefined predicate used in negation: ${predName}`);
    }
    if (resolution.type !== 'predicate') {
        throw new Error(`Cannot apply negation operator (!) to a variable: ${predName}`);
    }

    return negationExpr({
        resolverName: resolution.definition.mangledName,
        scopeDepth: resolution.scope.depth,
        goal: goal.arguments.map(argNode => transformExpression(argNode, context)),
    });
};