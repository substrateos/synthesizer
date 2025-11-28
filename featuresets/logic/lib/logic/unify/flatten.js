import symbols from '@/lib/logic/unify/symbols.js'

/**
 * Flattens a subgraph of logic variables from a 'source' scope chain into a new object.
 * Performs a transitive closure crawl starting from 'root'.
 *
 * @param {Object|null} proto - The prototype for the new object (e.g., lexical parent).
 * @param {Object} source - The source bindings (read-only, supports prototype chain).
 * @param {Object|Array|Symbol} root - The starting structure to scan for variables.
 * @returns {Object} A new object inheriting from 'proto' containing the flattened subgraph.
 */
export default function flatten(proto, source, root) {
    const target = Object.create(proto);

    // If there is no source to copy from, we simply return the
    // new object (which inherits from proto).
    if (!source) return target;

    const stack = [];
    const visited = new Set();

    // Seed the stack
    for (const sym of symbols(root, visited)) {
        stack.push(sym);
    }

    let sym;
    while ((sym = stack.pop())) {
        // We only copy from Source.
        // If it's not in Source (or Source's proto), we don't copy it to Target.
        let binding = source[sym];
        if (!binding) {
            continue
        }
        target[sym] = binding; // Shallow copy (Reference)

        // Value Pointers (X -> Y)
        if (binding.value) {
            for (const s of symbols(binding.value, visited)) {
                stack.push(s);
            }
        }

        // Constraint Trace (X > Y)
        if (binding.trace) {
            for (const event of binding.trace) {
                if (event.type === 'CONSTRAINT') {
                    for (const s of symbols(event.args, visited)) {
                        stack.push(s);
                    }
                }
            }
        }
    }

    return target;
}
