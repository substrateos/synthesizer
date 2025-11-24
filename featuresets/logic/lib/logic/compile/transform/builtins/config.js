import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

/**
 * Handles C = Logic.config()
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.config() can only be used on the right-hand side of an assignment (e.g., C = Logic.config()).");
    }

    if (node.arguments.length !== 0) {
        throw new Error('Logic.config() accepts no arguments.');
    }

    const targetCode = valueExpr(transformExpression(context.lhs, context), 'bindings');

    return [
        switchExpr('oppc', [
            ['undefined',
                `yieldValue = {`,
                `    type: 'config',`,
                `    resume: { clauseId, pc, bindings, vars, scopes, oppc: 1 }`,
                `}`,
                e => e.continue()],
            [1,
                `// resumeValue contains the runtime config object`,
                `bindings = unify(${targetCode}, resumeValue, bindings, location);`,
                `if (bindings) {`,
                `    pc++; // Success`,
                `    oppc = undefined;`,
                `    // fallthrough`,
                `} else {`,
                `    yieldValue = { type: 'fail' };`,
                `    break;`,
                `}`,
                e => e.fallthrough()]
        ])
    ];
};