import ifExpr from "@/lib/logic/compile/transform/exprs/if.js";
import findDependencies from "@/lib/logic/compile/transform/util/findDependencies.js";
import { simple } from "@/lib/logic/acorn-walk@8.3.4.js";

/**
 * Enforces "Safe Subset" rules for constraints.
 */
function validateConstraint(node, context) {
    simple(node, {
        // FORBIDDEN: Mutation
        AssignmentExpression(n) { throw new Error("Assignments are not allowed inside constraints."); },
        UpdateExpression(n) { throw new Error("Update expressions are not allowed inside constraints."); }
    });
}

export default ({ leftNode, rightNode, operator, startLocation, transformExpression }, context) => {
    const location = JSON.stringify(startLocation);

    // Validate structure (No side effects)
    validateConstraint(leftNode, context);
    validateConstraint(rightNode, context);

    const { params, args } = findDependencies([leftNode, rightNode], context, transformExpression);

    // Reconstruct source in arrow function
    //    (params...) => left op right
    const leftSrc = context.getRawSource(leftNode);
    const rightSrc = context.getRawSource(rightNode);
    const paramList = params.join(', ');
    const fnString = `(${paramList}) => ${leftSrc} ${operator} ${rightSrc}`;
    const argsList = args.join(', ');

    return [
        `bindings = unify.constrain(bindings, ${fnString}, [${argsList}], ${location});`,
        ifExpr(`bindings`, [
            `pc++;`, // Constraint satisfied or deferred
        ], [
            `yieldValue = { type: 'fail', location: ${location} };`,
            e => e.continue()
        ]),
    ];
}