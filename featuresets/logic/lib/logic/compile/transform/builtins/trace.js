import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

/**
 * Handles Trace = Logic.trace(Goal)
 * Delegates the actual call generation to CallExpression via context injection.
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.trace() can only be used on the right-hand side of an assignment.");
    }

    if (node.arguments.length !== 1) {
        throw new Error('Logic.trace() requires exactly one argument: The goal to trace.');
    }

    const goalNode = node.arguments[0];

    // Prepare the code to bind the result to the LHS variable.
    const targetVarExpr = valueExpr(transformExpression(context.lhs, context), 'bindings');

    return [
        `const traceLog = resume.traceLog ?? [];`,
        `const traceLogger = resume.traceLogger ?? createTracer(traceLog);`,
        transformExpression(goalNode, {
            ...context,
            lhs: undefined, // Clear LHS so CallExpression treats it as a void goal
            tracerExpr: 'traceLogger',
            resumeProps: 'traceLog, traceLogger',
            solutionExpr: [
                `const currentTrace = [...traceLog];`, // Snapshot for immutability
                `const traceBinding = unify(${targetVarExpr}, currentTrace, unify.mergeBindings(bindings, subgoalSolution), location);`,
                ``,
                `if (!traceBinding) {`,
                `    yieldValue = { type: 'fail' };`,
                `    continue;`,
                `}`,
                ``,
                `subgoalSolution = { ...subgoalSolution, ...traceBinding };`
            ]
        })
    ];
};