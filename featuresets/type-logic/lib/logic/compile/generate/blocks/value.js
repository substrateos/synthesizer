import reference from '@/lib/logic/compile/generate/blocks/reference';

/**
 * Creates a code string to resolve a logic term to its ground VALUE at runtime.
 */
export default (node, bindings) => `resolve(${reference(node)}, ${bindings}).value`;
