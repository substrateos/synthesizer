import findFreeVariables from "@/lib/logic/compile/transform/util/findFreeVariables.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";

/**
 * Scans AST nodes for free variables, resolves them against the scope,
 * and prepares the parameter/argument lists for a JS closure.
 * @param {Node|Node[]} nodes - The AST node(s) to scan.
 * @param {Object} context - The transformation context (scope, etc).
 * @param {Function} transformExpression - The transformer for generating var access.
 * @returns {Object} { params: String[], args: String[] }
 */
export default function findDependencies(nodes, context, transformExpression) {
    // normalize to array
    const nodeList = Array.isArray(nodes) ? nodes : [nodes];

    // find all unique free variables in the subtree(s)
    const allFreeVars = new Set();
    for (const node of nodeList) {
        const vars = findFreeVariables({ ast: node });
        for (const v of vars) allFreeVars.add(v);
    }

    const params = [];
    const args = [];

    for (const varName of allFreeVars) {
        const resolution = context.scope.resolveName(varName);
        switch (resolution?.type) {
            case 'variable':
            case 'predicate':
                params.push(varName);
                args.push(
                    groundExpr(
                        transformExpression({ type: 'Identifier', name: varName }, context),
                        'bindings'
                    )
                );
                break;
            case 'imported':
                params.push(varName);
                args.push(resolution.definition.mangledName);
                break;
            default:
                throw new Error(`Undeclared variable in expression: ${varName}`);
        }
    }

    return { params, args };
}
