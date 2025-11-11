/**
 * Generates a unique, flat name for a predicate based on its lexical path.
 * @param {string[]} path - An array of rule names from global to local.
 * @returns {string} The mangled predicate name, e.g., "pred_1_parent__child".
 */
export default function mangleName(path) {
    if (!path || path.length === 0) {
        return null;
    }

    const depth = path.length - 1;
    const nameParts = path.join('__');
    return `pred_${depth}__${nameParts}`;
}