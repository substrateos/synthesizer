import transformAssignment from "@/lib/logic/compile/transform/nodes/AssignmentExpression.js";

/**
 * Transforms a VariableDeclaration statement (e.g., `var A = 10, B;`)
 * into a series of unification goals for any variables with initial values.
 */
export default function transformVariableDeclaration(stmt, context) {
    // A single `var` statement can declare multiple variables.
    return stmt.declarations.flatMap(declarator => {
        // We only generate a goal if there's an initial value (e.g., `= 10`).
        if (!declarator.init) {
            return [];
        }

        // We can treat `var A = 10` as being logically equivalent to `A = 10`.
        // To do this, we'll construct a fake AssignmentExpression node
        // and pass it to the existing assignment transformer.
        const assignmentExpr = {
            type: 'AssignmentExpression',
            operator: '=',
            left: declarator.id,
            right: declarator.init,
        };
        return transformAssignment(assignmentExpr, context);
    });
}