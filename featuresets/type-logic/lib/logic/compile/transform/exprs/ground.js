/**
 * Creates a code string to resolve a logic term to its ground VALUE at runtime.
 */
export default (expr, bindings) => `unify.ground(${expr}, ${bindings})`;
