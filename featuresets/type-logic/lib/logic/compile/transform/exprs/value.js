import referenceExpr from "@/lib/logic/compile/transform/exprs/reference.js";

/**
 * Creates a code string to resolve a logic term to its ground VALUE at runtime.
 */
export default (node, bindings) => `unify.resolve(${referenceExpr(node)}, ${bindings}).value`;
