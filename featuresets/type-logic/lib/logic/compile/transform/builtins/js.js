import jsExpr from "@/lib/logic/compile/transform/exprs/js.js";
import findFreeVariables from "@/lib/logic/compile/transform/util/findFreeVariables.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";

export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.js() can only be used on the right-hand side of an assignment (e.g., Result = Logic.js(...)).");
    }

    const args = node.arguments;
    if (args.length !== 1) {
        throw new Error(`Logic.js() requires exactly 1 argument: Expression.`);
    }
    const [exprNode] = args;

    // Variable analysis
    const allFreeVars = findFreeVariables({ ast: exprNode });
    const logicVars = [];
    const importVars = []; // Stores { name, access }

    for (const varName of allFreeVars) {
        const resolution = context.scope.resolveName(varName);
        if (resolution?.type === 'variable') {
            logicVars.push(varName);
        } else if (resolution?.type === 'imported') {
             // Use the mangled name defined in the scope
             importVars.push({ name: varName, access: resolution.definition.mangledName });
        } else if (resolution?.type === 'predicate') {
            throw new Error(
                `Cannot use predicate name '${varName}' directly inside Logic.js().`
            );
        } else {
            throw new Error(
                `Undeclared variable(s) in Logic.js(): ${varName}.`
            );
        }
    }

    const allParamNames = [...logicVars, ...importVars.map(i => i.name)];
    
    const resolvedArgValues = [
        // Logic Variables: Delegate to transformExpression, then ground.
        ...logicVars.map(name => 
            groundExpr(
                transformExpression({ type: 'Identifier', name }, context), 
                'bindings'
            )
        ),
        // Imports: Pass the mangled identifier.
        ...importVars.map(i => i.access)
    ];

    return jsExpr({
        target: transformExpression(context.lhs, context),
        rawString: context.getRawSource(exprNode),
        paramNames: allParamNames,
        argValues: resolvedArgValues
    });
};