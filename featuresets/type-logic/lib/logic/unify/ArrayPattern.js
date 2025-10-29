import { unifyTag, groundTag, reprTag, symbolsTag } from "@/lib/logic/tags";

/**
 * Calculates the minimum required length for a pattern.
 * Spread variables have a min-length of 0.
 */
function getMinLength(unify, term, bindings) {
    if (term === null || term === undefined) return 0;

    // Resolve the term in case it's a variable bound to a concrete array
    const resolved = unify.resolve(term, bindings).value;

    if (Array.isArray(resolved)) return resolved.length;

    if (resolved instanceof ArrayPattern) {
        // Recursively sum the min-lengths of the head and tail
        return getMinLength(unify, resolved.head, bindings) +
            getMinLength(unify, resolved.tail, bindings);
    }
    // It's a spread variable (Symbol) or something else; min-length is 0.
    return 0;
}

/**
 * Unifies a pattern (head, tail) against a concrete JS array.
 */
function unifyAgainstArray(unify, head, tail, value, bindings, location) {
    // Resolve the head to its concrete value
    const p_head = unify.resolve(head, bindings).value;

    // Case: Head is a fixed array, e.g., [1, ...X]
    if (Array.isArray(p_head)) {
        if (value.length < p_head.length) return null; // Not enough elements

        // Unify the fixed head part
        for (let i = 0; i < p_head.length; i++) {
            bindings = unify(p_head[i], value[i], bindings, location);
            if (bindings === null) return null;
        }

        // Recursively unify the tail with the rest of the array
        const restOfValue = value.slice(p_head.length);

        // Base case for empty tail
        if (!tail) {
            return restOfValue.length === 0 ? bindings : null;
        }
        return unify(tail, restOfValue, bindings, location);
    }

    // Case: Head is a spread variable, e.g., [...X, 1]
    if (typeof p_head === 'symbol') {
        // --- NON-GREEDY "FIND-FIRST-SPLIT" LOGIC ---
        // Find the minimum length the tail requires
        const tailMinLen = getMinLength(unify, tail, bindings);
        if (value.length < tailMinLen) return null; // Not enough elements for the tail

        // We must find the *first* split point `i` in `value`
        // where `head` takes `value.slice(0, i)` and
        // `tail` can unify with `value.slice(i)`.

        // The head can take at most `value.length - tailMinLen` elements.
        const maxHeadSize = value.length - tailMinLen;

        // Loop `i` from 0 (head takes empty) up to maxHeadSize.
        for (let i = 0; i <= maxHeadSize; i++) {
            const headValue = value.slice(0, i);
            const tailValue = value.slice(i);

            // Try to unify the tail first. This is the "lookahead".
            // We pass the *current* bindings.

            // Do tail base case check
            const tailBindings = !tail
                ? (tailValue.length === 0 ? bindings : null)
                : unify(tail, tailValue, bindings, location);

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

    // Head is not a fixed array or a spread variable. This is an invalid pattern.
    return null;
}

class ArrayPattern {
    static from([head, ...tailParts]) {
        switch (tailParts.length) {
            case 0:
                return typeof head === 'symbol' ? new this(head) : head
            case 1:
                const tail = tailParts[0]
                if (Array.isArray(tail) && tail.length === 0) {
                    return typeof head === 'symbol' ? new this(head) : head
                }
                if (typeof tail !== 'symbol') {
                    return new this(head, tail)
                }
            // fallthrough if tail is symbol.
        }
        return new this(head, this.from(tailParts))
    }

    static of(...parts) {
        return this.from(parts)
    }

    constructor(head, tail) {
        this.head = head
        this.tail = tail
    }

    *parts() {
        yield this.head
        const tail = this.tail
        if (tail instanceof this.constructor) {
            yield* tail.parts()
        } else if (tail?.length) {
            yield tail
        }
    }

    *[symbolsTag](symbols) {
        for (const part of this.parts()) {
            if (typeof part === 'symbol') {
                yield part
            } else {
                yield* symbols(part)
            }
        }
    }

    [reprTag](repr) {
        return `[${Array.from(this.parts(), part => {
            if (typeof part === 'symbol') {
                return `...${repr(part)}`
            }
            return part.map(repr)
        }).flat().join(", ")}]`
    }

    [unifyTag](unify, value, bindings, location) {
        // Pattern-vs-Pattern Unification
        // Symmetrically unify the parts.
        if (value instanceof ArrayPattern) {
            // Unify heads
            bindings = unify(this.head, value.head, bindings, location);
            if (bindings === null) return null;

            const thisTailEmpty = !this.tail;
            const valueTailEmpty = !value.tail;
            if (thisTailEmpty && valueTailEmpty) {
                return bindings;
            }
            // Unify tails
            return unify(this.tail, value.tail, bindings, location);
        }

        // Pattern-vs-Value Unification
        // Value must be a concrete array to proceed.
        if (Array.isArray(value)) {
            return unifyAgainstArray(unify, this.head, this.tail, value, bindings, location);
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

        const handleGroundedPart = (groundedPart) => {
            if (typeof groundedPart === 'symbol') {
                // It's an UNBOUND spread. This is our "gap".
                pushAcc()
                parts.push(groundedPart)
            } else if (Array.isArray(groundedPart)) {
                // It's a BOUND spread. If not an Array or ArrayPattern, then error.
                if (!acc) { acc = [] }
                acc.push(...groundedPart)
            } else if (groundedPart instanceof ArrayPattern) {
                for (const p of groundedPart.parts()) {
                    handleGroundedPart(p)
                }
            } else {
                return false
            }
            return true
        }

        for (let part of this.parts()) {
            if (!handleGroundedPart(ground(part, bindings))) {
                throw new Error(`Cannot ground ArrayPattern: spread variable '${part.description}' was bound to a non-array value.`);
            }
        }
        pushAcc()

        switch (parts.length) {
            case 0:
                return []
            case 1:
                return parts[0]
        }

        return ArrayPattern.from(parts)
    }
}

export default ArrayPattern
