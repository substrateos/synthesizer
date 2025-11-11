/**
 * Creates a proxy-based helper for generating and caching logic variables (Symbols).
 */
export default function vars() {
    return new Proxy({}, {
        get(target, prop) {
            if (!Object.hasOwn(target, prop)) {
                target[prop] = Symbol(prop);
            }
            return target[prop];
        }
    });
}
