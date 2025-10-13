import { unifyTag, groundTag } from '@/lib/logic/tags';

/**
 * A formal class to represent a list destructuring pattern (e.g., [H, ...T]).
 */
export default class ArrayPattern {
    constructor(head, tail) {
        this.head = head;
        this.tail = tail;
    }

    /**
     * The custom unification logic for this pattern.
     * This method is called by the main `unify` function.
     * @param {*} value - The value to unify against (expected to be an array).
     * @param {object} bindings - The current set of variable bindings.
     * @param {object} location - The source location for tracing.
     * @returns {object|null} The new bindings object on success, or null on failure.
     */
    [unifyTag](unify, value, bindings, location) {
        if (!Array.isArray(value) || value.length < this.head.length) {
            return null;
        }

        // Unify the head elements.
        for (let i = 0; i < this.head.length; i++) {
            bindings = unify(this.head[i], value[i], bindings, location);
            if (bindings === null) {
                return null;
            }
        }

        // Unify the tail with the rest of the array.
        const tailValue = value.slice(this.head.length);
        return unify(this.tail, tailValue, bindings, location);
    }

    /**
     * The custom grounding logic for this pattern.
     * This method is called by the `ground()` function in `solution.js`
     * to convert the engine's internal representation into a user-friendly format.
     * @param {function} ground - The main `ground` function for recursive calls.
     * @param {object} bindings - The final solution bindings.
     * @returns {Array} The reconstructed JavaScript array.
     */
    [groundTag](ground, bindings) {
        const head = ground(this.head, bindings);
        const tail = ground(this.tail, bindings);
        return [...head, ...tail];
    }
}
