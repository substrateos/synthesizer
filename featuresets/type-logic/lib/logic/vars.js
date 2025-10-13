/**
 * Creates a proxy-based helper for generating and caching logic variables (Symbols).
 * Each property access on the returned object will either return a cached Symbol
 * or create, cache, and return a new one.
 *
 * @returns {Proxy} An object that provides Symbols on property access.
 */
export default function vars() {
    // 1. A private cache, held within the closure for this instance.
    const cache = {};

    // 2. A Proxy intercepts property access.
    return new Proxy(cache, {
        /**
         * The 'get' trap is fired whenever a property is accessed.
         * @param {object} target - The cache object.
         * @param {string} prop - The string name of the property being accessed (e.g., "X").
         */
        get(target, prop) {
            // 3. Cache Hit: If the symbol already exists, return it.
            if (Object.hasOwn(target, prop)) {
                return target[prop];
            }

            // 4. Cache Miss: Create, cache, and return a new symbol.
            const newSymbol = Symbol(prop);
            target[prop] = newSymbol;
            return newSymbol;
        }
    });
}
