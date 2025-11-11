import transformGlobals from "@/lib/logic/compile/transform/globals.js";
import callExpr from "@/lib/logic/compile/transform/exprs/call.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";
import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";

export default function transformCallExpression(transformExpression, node, context) {
    const globalGoal = transformGlobals(transformExpression, node, context);
    if (globalGoal) return globalGoal;

    if (node.callee.type !== 'Identifier') {
        throw new Error(`Unsupported complex callee type: ${node.callee.type}. Use Logic.js() for arbitrary JavaScript calls.`);
    }
    if (context.lhs) throw new SyntaxError("cannot yet use the return value of another predicate");

    const calleeName = node.callee.name;
    const resolution = context.scope.resolveName(calleeName);
    if (!resolution) throw new Error(`Undefined predicate or variable used in call: ${calleeName}`);

    const argsExpr = `[${node.arguments.map(argNode => groundExpr(transformExpression(argNode, context), 'bindings')).join(', ')}]`;

    if (resolution.type === 'imported') {
        // Use definition.mangledName and unwrap.
        return callExpr({
            resolverExpr: `${resolution.definition.mangledName}[resolverTag]`,
            argsExpr,
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    if (resolution.type === 'variable') {
        return callExpr({
            resolverExpr: valueExpr(transformExpression(node.callee, context), 'bindings'),
            argsExpr,
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    if (resolution.type === 'predicate') {
        const resolverName = resolution.definition.mangledName
        const scopeDepth = resolution.scope.depth
        const scopes = (scopeDepth === 0) ? 'null' : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;

        return callExpr({
            resolverExpr: `${resolverName}.bind(null, ${scopes})`,
            argsExpr,
            startLocation: context.getRawSourceLocation(node.start),
        });
    }

    throw new Error(`Unexpected resolution type for ${calleeName}: ${resolution.type}`);
}