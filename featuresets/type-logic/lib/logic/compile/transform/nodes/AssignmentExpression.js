import trimNode from '@/lib/logic/compile/transform/util/trim';
import findFreeVariables from '@/lib/logic/compile/transform/util/findFreeVariables';

/**
 * Transforms an AssignmentExpression AST node into a unification or JS execution IR goal.
 * @param {object} expr - The AssignmentExpression AST node.
 * @param {ClauseInfo} context - The context containing { scope, getRawSource, astNode, ... }.
 * Scope object is expected to have a 'depth' property.
 * @returns {object|null} The IR goal object, or null if no goal needed.
 */
export default function transformAssignmentExpression(expr, context) {
    // Ensure context and scope are valid
    if (!context || !context.scope) {
        throw new Error("transformAssignmentExpression requires a context with a scope.");
    }

    // --- Special Case: RHS is Number(...) or Logic.js(...) ---
    if (expr.right.type === 'CallExpression') {
        const callee = expr.right.callee;
        const args = expr.right.arguments;

        const isNumberCall = callee.type === 'Identifier' && callee.name === 'Number';
        const isLogicJsCall = callee.type === 'MemberExpression' &&
                              callee.object.type === 'Identifier' && callee.object.name === 'Logic' &&
                              callee.property.type === 'Identifier' && callee.property.name === 'js';

        if (isNumberCall || isLogicJsCall) {
            const opName = isNumberCall ? 'Number' : 'Logic.js';
            if (args.length !== 1) {
                throw new Error(`${opName}() requires exactly 1 argument: Expression.`);
            }
            const exprNode = args[0];

            // 1. Find ALL free variables in the JS expression
            const allFreeVars = findFreeVariables({ ast: exprNode });

            // 2. Validate free variables against the logic scope using resolveName
            const logicVars = []; // Store names of *logic* variables used
            for (const varName of allFreeVars) {
                const resolution = context.scope.resolveName(varName);
                if (resolution?.type === 'variable') {
                    logicVars.push(varName); // It's a known logic variable
                } else if (resolution?.type === 'predicate') {
                    // Predicate names aren't directly usable as values in JS expressions
                    throw new Error(
                        `Cannot use predicate name '${varName}' directly inside ${opName}(). Pass it as a variable if needed.`
                     );
                } else {
                    // Not found or not a variable -> Undeclared in logic scope
                    throw new Error(
                        `Undeclared variable(s) in ${opName}(): ${varName}. ` +
                        `Only logic variables from the rule's scope can be used.`
                    );
                }
            }

            // 3. Get the raw source string for the JS expression
            const rawString = context.getRawSource(exprNode);

            // 4. Return the 'js' IR op
            return {
                type: 'js',
                target: trimNode(expr.left), // LHS of the assignment
                rawString: rawString,
                logicVars: logicVars, // List of logic variable names used
            };
        }
    }

    // --- Special Case: RHS is an Identifier ---
    if (expr.right.type === 'Identifier') {
        const rhsName = expr.right.name;

        if (rhsName === '_') {
            return { type: 'unify', op: trimNode(expr), startLocation: context.getRawSourceLocation(expr.left.start) }; // Fall through to default unification
        }

        const resolution = context.scope.resolveName(rhsName);

        // Check if the name is unresolved
        if (!resolution) {
             throw new Error(`Undefined predicate or variable used on RHS of assignment: ${rhsName}`);
        }

        // Check if it resolves to a predicate (for assignment binding)
        if (resolution.type === 'predicate') {
            const op = trimNode(expr);

            const scopeDepth = resolution.scope.depth;
            let scopes = 'null';
            if (scopeDepth > 0) {
                // Slice the *runtime* 'scopes' array up to the parent level (resolution.scope.depth).
                // The runtime 'scopes' variable will hold the caller's scopes array.
                // The slice captures the array [globalData, ..., parent_of_definition_Data].
                scopes = `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth+1})`;
            }

            op.right = { type: 'Identifier', name: `${resolution.definition.mangledName}.bind(null, ${scopes})` };

            return { type: 'unify', op, isRightAlreadyResolved: true, startLocation: context.getRawSourceLocation(op.left.start) };
        }
        // If resolution.type === 'variable', fall through to default unification.
    }

    // --- Default Case: Standard Unification ---
    // Handles X=Y, X=1, X=[H|T], X={a:A}, etc.
    // No special handling needed, just pass the trimmed AST node.
    return { type: 'unify', op: trimNode(expr), startLocation: context.getRawSourceLocation(expr.left.start) };
}
