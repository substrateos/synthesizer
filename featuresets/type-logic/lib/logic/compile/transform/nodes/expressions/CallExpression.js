import transformGlobals from "@/lib/logic/compile/transform/globals.js"; // Handles Logic.* calls
import callExpr from "@/lib/logic/compile/transform/exprs/call.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";
import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

/**
 * Transforms a CallExpression node into a callExpr IR instruction.
 * Uses the scope's resolveName method to determine if it's a static
 * call to a known predicate or a dynamic call using a variable.
 * Calculates the scope slice needed for static calls.
 * @param {function} transformExpression - The dependency-injected main expression transformer.
 * @param {object} node - The CallExpression AST node.
 * @param {ClauseInfo} context - The context containing { scope, getRawSource, ... }.
 * @returns {object} The callExpr IR object.
 */
export default function transformCallExpression(transformExpression, node, context) {
    // Handle Built-ins (e.g., Logic.all) first
    const globalGoal = transformGlobals(transformExpression, node, context);
    if (globalGoal) {
        return globalGoal;
    }

    // Assuming the callee is a simple Identifier for logic calls
    if (node.callee.type !== 'Identifier') {
        throw new Error(`Unsupported complex callee type: ${node.callee.type}. Use Logic.js() for arbitrary JavaScript calls.`);
    }

    if (context.lhs) {
        throw new SyntaxError("cannot yet use the return value of another predicate")
    }

    // Resolve the callee name using the current scope
    const calleeName = node.callee.name;
    const resolution = context.scope.resolveName(calleeName);
    if (!resolution) {
        throw new Error(`Undefined predicate or variable used in call: ${calleeName}`);
    }

    const argsExpr = `[${node.arguments.map(argNode => groundExpr(transformExpression(argNode, context), 'bindings')).join(', ')}]`;

    if (resolution.type === 'variable') {
        // It's a dynamic call where the predicate name/function is stored in a variable
        return callExpr({
            resolverExpr: valueExpr(transformExpression(node.callee, context), 'bindings'),
            argsExpr,
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    if (resolution.type === 'predicate') {
        // The runtime variable 'scopes' holds the *full* chain including the current level.
        // Slicing up to scopeDepth gives [globalData, ..., parent_of_definition_Data].
        const resolverName = resolution.definition.mangledName
        const scopeDepth = resolution.scope.depth
        const scopes = (scopeDepth === 0) ? 'null' : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;

        return callExpr({
            resolverExpr: `${resolverName}.bind(null, ${scopes})`,
            argsExpr,
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    // Should be unreachable
    throw new Error(`Unexpected resolution type for ${calleeName}: ${resolution.type}`);
}