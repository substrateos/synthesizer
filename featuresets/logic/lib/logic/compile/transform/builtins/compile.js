import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

/**
 * Handles P = Logic.compile(Source)
 * * Transforms into a sequence that:
 * 1. Yields for config.
 * 2. Compiles the source.
 * 3. Unwraps the result (accessing [resolverTag]) to get the raw generator.
 * 4. Binds the raw generator to the target variable.
 */
export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.compile() can only be used on the right-hand side of an assignment (e.g., P = Logic.compile(...)).");
    }

    if (node.arguments.length !== 1) {
        throw new Error('Logic.compile() requires exactly one argument: Source.');
    }

    const targetCode = valueExpr(transformExpression(context.lhs, context), 'bindings');
    // We ground the source argument to ensure we pass a string to the compiler
    const sourceCode = `unify.ground(${transformExpression(node.arguments[0], context)}, bindings)`;

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
                `const compiled = resumeValue.compile(${sourceCode});`,
                `const result = typeof compiled === 'function' ? compiled[resolverTag] : Object.fromEntries(Object.entries(compiled).map(([k, v]) => [k, v[resolverTag]]))`,
                `bindings = unify(${targetCode}, result, bindings, location);`,
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
