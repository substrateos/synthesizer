import jsExpr from "@/lib/logic/compile/transform/exprs/js.js";
import findDependencies from "@/lib/logic/compile/transform/util/findDependencies.js";

export default (transformExpression, node, context) => {
    if (!context.lhs) {
        throw new Error("Logic.js() can only be used on the right-hand side of an assignment.");
    }

    const args = node.arguments;
    if (args.length !== 1) {
        throw new Error(`Logic.js() requires exactly 1 argument: Expression.`);
    }
    const [exprNode] = args;

    const { params, args: argValues } = findDependencies(exprNode, context, transformExpression);

    return jsExpr({
        target: transformExpression(context.lhs, context),
        rawString: context.getRawSource(exprNode),
        paramNames: params,
        argValues: argValues
    });
};