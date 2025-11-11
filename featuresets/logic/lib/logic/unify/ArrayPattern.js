import { unifyTag, groundTag, reprTag, symbolsTag } from "@/lib/logic/tags.js";
import Value from "@/lib/logic/unify/Value.js";

/**
 * Calculates the minimum length of a concrete array,
 * ignoring any contiguous optional Value instances at the end.
 */
function getArrayMinLength(arr) {
    let minLen = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
        if (Value.isOptional(arr[i])) {
            minLen--;
        } else {
            break; // Stop at first non-default
        }
    }
    return minLen;
}

/**
 * Calculates the minimum required length for a pattern.
 * Spread variables have a min-length of 0.
 * This is called on a TERM.
 */
function getMinLength(unify, term, bindings) {
    if (term === null || term === undefined) return 0;

    // Resolve the term in case it's a variable bound to a concrete array
    const resolved = unify.resolve(term, bindings).value;

    if (Array.isArray(resolved)) {
        return getArrayMinLength(resolved);
    }

    if (resolved instanceof ArrayPattern) {
        return resolved.parts.reduce((acc, part) => {
            // part is a term, e.g. [1,2] or Symbol('X')
            // getMinLength on Symbol('X') resolves to 0.
            // getMinLength on [1,2] resolves to 2.
            return acc + getMinLength(unify, part, bindings);
        }, 0);
    }
    // It's a spread variable (Symbol) or something else; min-length is 0.
    return 0;
}

/**
 * Unifies a pattern (represented by a parts array) against a concrete JS array.
 * @param {Array} parts - The pattern's internal parts array.
 */
function unifyAgainstArray(unify, parts, value, bindings, location) {
    // Base Case: No parts left to match.
    if (parts.length === 0) {
        return value.length === 0 ? bindings : null; // Succeed only if value is also empty.
    }

    const [part, ...restParts] = parts;
    const p_head = unify.resolve(part, bindings).value; // 'part' is the head term

    // Case: Head is a fixed array, e.g., [1, ...X]
    if (Array.isArray(p_head)) {
        const minLen = getArrayMinLength(p_head);

        if (value.length < minLen) return null; // Not enough elements

        let valueToUnify = value; 
        if (p_head.length > valueToUnify.length) {
            // Create a padded version of the value for unification
            valueToUnify = [...valueToUnify];
            while (valueToUnify.length < p_head.length) {
                valueToUnify.push(undefined);
            }
        }

        // Unify the fixed head part
        for (let i = 0; i < p_head.length; i++) {
            bindings = unify(p_head[i], valueToUnify[i], bindings, location);
            if (bindings === null) return null;
        }

        // Determine how many elements were *actually* consumed from the original value
        const consumedLength = Math.min(value.length, p_head.length);

        // Recursively unify the rest
        const tailTerm = ArrayPattern.from(restParts);
        return unify(tailTerm, value.slice(consumedLength), bindings, location);
    }

    // Case: Head is a spread variable, e.g., [...X, 1]
    if (typeof p_head === 'symbol') {
        // --- NON-GREEDY "FIND-FIRST-SPLIT" LOGIC ---
        // Find the minimum length the tail requires
        // We create a temporary tail term to measure it.
        const tailTerm = ArrayPattern.from(restParts);
        const tailMinLen = getMinLength(unify, tailTerm, bindings);

        if (value.length < tailMinLen) return null; // Not enough elements for the tail

        // We must find the *first* split point `i` in `value`
        // where `head` takes `value.slice(0, i)` and
        // `tailTerm` can unify with `value.slice(i)`.

        // The head can take at most `value.length - tailMinLen` elements.
        const maxHeadSize = value.length - tailMinLen;

        // Loop `i` from 0 (head takes empty) up to maxHeadSize.
        for (let i = 0; i <= maxHeadSize; i++) {
            const headValue = value.slice(0, i);
            const tailValue = value.slice(i);

            // Try to unify the tail first. This is the "lookahead".
            // We pass the *current* bindings.
            const tailBindings = unify(tailTerm, tailValue, bindings, location);

            // Did the tail match?
            if (tailBindings !== null) {
                // Yes! Now, can we bind the head to its part?
                // We must use the *new* bindings from the tail match.
                const finalBindings = unify(p_head, headValue, tailBindings, location);

                if (finalBindings !== null) {
                    // Success! We found a valid split.
                    return finalBindings;
                }
                // If the head binding failed (e.g., occurs check),
                // this split is invalid. We just continue the loop
                // to find another tail match. (This is rare).
            }
        }

        // We looped through all possible splits and none worked.
        return null;
    }

    // Case: Head is another ArrayPattern (e.g., from a bound var `[...A] = [...B]`)
    if (p_head instanceof ArrayPattern) {
        // Flatten it and retry
        const newParts = [...p_head.parts, ...restParts];
        return unifyAgainstArray(unify, newParts, value, bindings, location);
    }

    // Head is not a fixed array or a spread variable. This is an invalid pattern.
    return null;
}

class ArrayPattern {
    /**
     * Factory method.
     * Takes an array of terms (parts) and decides whether to return
     * a simple value (like a concrete array) or a new ArrayPattern instance.
     * @param {Array<any>} parts - An array of terms, e.g., [[1,2], Symbol('X')]
     */
    static from(parts) {
        if (!parts || parts.length === 0) return [];

        if (parts.length === 1) {
            const part = parts[0]
            if (!Array.isArray(part) || !part.some(e => Value.isOptional(e))) {
                return part;
            }
        }
        // Otherwise, we need a pattern instance to handle the logic.
        return new this(...parts);
    }

    /**
     * Public factory.
     * e.g., ArrayPattern.of([1,2], X, [3])
     */
    static of(...parts) {
        return this.from(parts)
    }

    /**
     * @param {Array<any>} parts - An array of terms.
     */
    constructor(...parts) {
        this.parts = parts || [];
    }

    *[symbolsTag](symbols) {
        for (const part of this.parts) {
            yield* symbols(part);
        }
    }

    [reprTag](repr) {
        return `[${Array.from(this.parts, part => {
            if (typeof part === 'symbol') {
                return `...${repr(part)}`
            }
            return part.map(repr)
        }).flat().join(", ")}]`
    }

    [unifyTag](unify, otherBinding, bindings, location, selfBinding) {
        const value = otherBinding.value
        if (typeof value === 'symbol') {
            bindings = unify.bind(otherBinding, selfBinding, bindings, location)
            if (bindings === null) return null;
        }

        // Pattern-vs-Pattern Unification
        if (value instanceof ArrayPattern) {
            // Attempt to ground the 'value' pattern using the current bindings.
            const groundedValue = unify.ground(value, bindings);

            // If grounding resulted in a concrete array (not a pattern),
            // unify against that array instead of using the symmetric logic.
            if (Array.isArray(groundedValue)) {
                return unifyAgainstArray(unify, this.parts, groundedValue, bindings, location);
            }

            // If grounding failed (result is still an ArrayPattern),
            // fall back to the symmetric (syntactic) unification logic.
            // This is correct for unbound pattern vs. unbound pattern.
            const thisHead = this.parts[0];
            const thisTail = ArrayPattern.from(this.parts.slice(1));

            const valueHead = value.parts[0];
            const valueTail = ArrayPattern.from(value.parts.slice(1));

            // Unify heads
            bindings = unify(thisHead, valueHead, bindings, location);
            if (bindings === null) return null;

            // Unify tails
            return unify(thisTail, valueTail, bindings, location);
        }

        // Pattern-vs-Value Unification
        // Value must be a concrete array to proceed.
        if (Array.isArray(value)) {
            // Call the recursive helper with our parts list.
            return unifyAgainstArray(unify, this.parts, value, bindings, location);
        }

        if (typeof value === 'symbol') {
            return unify.walk(this.parts, bindings, location)
        }

        // Value is not a pattern, not an array, and not a variable. Fail.
        return null;
    }

    /**
     * Grounds the pattern based on the bindings.
     * Respects the original order of parts for JS spread semantics.
     */
    [groundTag](ground, bindings) {
        let parts = [];
        let acc = undefined;

        const pushAcc = () => {
            if (!acc?.length) return
            parts.push(acc)
            acc = undefined;
        }

        // This recursive helper is designed to work with a flat list of parts
        const handleGroundedPart = (groundedPart) => {
            if (typeof groundedPart === 'symbol') {
                // It's an UNBOUND spread. This is our "gap".
                pushAcc()
                parts.push(groundedPart)
            } else if (Array.isArray(groundedPart)) {
                // It's a BOUND spread.
                if (!acc) { acc = [] }
                acc.push(...groundedPart)
            } else if (groundedPart instanceof ArrayPattern) {
                // It's a nested, partially bound pattern. Recurse.
                for (const p of groundedPart.parts) {
                    handleGroundedPart(ground(p, bindings)); // Must ground sub-parts
                }
            } else {
                return false
            }
            return true
        }

        for (let part of this.parts) {
            if (!handleGroundedPart(ground(part, bindings))) {
                throw new Error(`Cannot ground ArrayPattern: spread variable '${part.description}' was bound to a non-array value.`);
            }
        }
        pushAcc()

        return ArrayPattern.from(parts)
    }
}

export default ArrayPattern
