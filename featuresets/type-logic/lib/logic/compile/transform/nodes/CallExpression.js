import trimNode from "@/lib/logic/compile/transform/util/trim.js";
import transformGlobals from "@/lib/logic/compile/transform/globals.js"; // Handles Logic.* calls
import subgoalExpr from "@/lib/logic/compile/transform/exprs/subgoal.js";

/**
 * Transforms a CallExpression node into a subgoalExpr IR instruction.
 * Uses the scope's resolveName method to determine if it's a static
 * call to a known predicate or a dynamic call using a variable.
 * Calculates the scope slice needed for static calls.
 * @param {object} node - The CallExpression AST node.
 * @param {ClauseInfo} context - The context containing { scope, getRawSource, ... }.
 * @returns {object} The subgoalExpr IR object.
 */
export default function transformCallExpression(node, context) {
    // Handle Built-ins (e.g., Logic.all) first
    const globalGoal = transformGlobals(node, context);
    if (globalGoal) {
        return globalGoal;
    }

    // Assuming the callee is a simple Identifier for logic calls
    if (node.callee.type !== 'Identifier') {
        throw new Error(`Unsupported complex callee type: ${node.callee.type}. Use Logic.js() for arbitrary JavaScript calls.`);
    }
    const calleeName = node.callee.name;

    // Resolve the callee name using the current scope
    const resolution = context.scope.resolveName(calleeName);

    // Handle different resolution results
    if (!resolution) {
        throw new Error(`Undefined predicate or variable used in call: ${calleeName}`);
    }

    if (resolution.type === 'variable') {
        // It's a dynamic call where the predicate name/function is stored in a variable
        return subgoalExpr({
            call: trimNode(node), // Contains the variable name in node.callee
            isDynamic: true,      // Mark as dynamic
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    if (resolution.type === 'predicate') {
        return subgoalExpr({
            call: trimNode(node),
            resolverName: resolution.definition.mangledName,
            scopeDepth: resolution.scope.depth, 
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    // Should be unreachable
    throw new Error(`Unexpected resolution type for ${calleeName}: ${resolution.type}`);
}