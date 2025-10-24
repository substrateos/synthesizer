import { unifyTag, groundTag } from "@/lib/logic/tags";
import unifyPattern from "@/lib/logic/unify/pattern";

export default class ArrayPattern {

    constructor(...parts) {
        this.parts = parts;
    }

    /** Checks if a value is a plain array. */
    isConcreteType(value) {
        return Array.isArray(value);
    }

    /** Returns the concrete value of a fully-bound canonical pattern. */
    getConcreteValue(canonical) {
        // A bound canonical form only has pre and post parts.
        return [...canonical.pre, ...canonical.post];
    }

    /**
     * "Reduces" the pattern's parts based on current bindings
     * into a canonical (pre, rest, post) form.
     * @throws {Error} If the pattern is ambiguous (>1 unbound rest) or ill-formed.
     */
    reduce(resolve, bindings) {
        const pre = [];
        let rest = null;
        const post = [];
        let foundRest = false;
        let acc = pre;

        for (const part of this.parts) {
            if (typeof part === 'symbol') {
                // --- Part is a Rest Variable ---
                const { value: resolvedPart } = resolve(part, bindings);
                if (typeof resolvedPart === 'symbol') {
                    // It's an UNBOUND rest. This is our "gap".
                    if (foundRest) {
                        throw new Error(`ArrayPattern is ambiguous: more than one rest variable ('${rest.description}', '${resolvedPart.description}') is unbound.`);
                    }
                    foundRest = true;
                    rest = resolvedPart;
                    acc = post;
                } else {
                    // It's a BOUND rest. It must be an array.
                    if (!Array.isArray(resolvedPart)) {
                        throw new Error(`ArrayPattern rest variable '${part.description}' was bound to a non-array value.`);
                    }
                    // Add its elements to the correct bucket
                    acc.push(...resolvedPart);
                }
            } else {
                // --- Part is a Fixed Array ---
                // Add its elements to the correct bucket
                acc.push(...part);
            }
        }
        return { pre, rest, post };
    }

    /** Unifies a canonical, unbound pattern against a concrete array. */
    unifyWithConcrete(unify, canonical, value, bindings, location) {
        const { pre, rest, post } = canonical;
        const minLen = pre.length + post.length;

        // Check length constraints
        if (value.length < minLen || (!rest && value.length !== minLen)) {
            return null;
        }

        // 1. Unify Pre
        for (let i = 0; i < pre.length; i++) {
            bindings = unify(pre[i], value[i], bindings, location);
            if (bindings === null) return null;
        }

        // 2. Unify Post
        for (let i = 0; i < post.length; i++) {
            const postIdx = post.length - 1 - i;
            const valIdx = value.length - 1 - i;
            bindings = unify(post[postIdx], value[valIdx], bindings, location);
            if (bindings === null) return null;
        }

        // 3. Unify Rest
        if (rest) {
            const restValue = value.slice(pre.length, value.length - post.length);
            bindings = unify(rest, restValue, bindings, location);
            if (bindings === null) return null; // Added check
        }

        return bindings;
    }

/**
     * Symmetrically unifies two unbound canonical array patterns (pre, rest, post).
     * This implements a greedy, deterministic unification.
     */
    unifyWithPattern(unify, p1, p2, bindings, location) {
        const { pre: pre1, rest: rest1, post: post1 } = p1;
        const { pre: pre2, rest: rest2, post: post2 } = p2;

        // --- 1. Unify Pre sections ---
        const minPreLen = Math.min(pre1.length, pre2.length);
        for (let i = 0; i < minPreLen; i++) {
            bindings = unify(pre1[i], pre2[i], bindings, location);
            if (bindings === null) return null;
        }
        // Leftover pre parts
        const rem1_pre = pre1.slice(minPreLen);
        const rem2_pre = pre2.slice(minPreLen);

        // --- 2. Unify Post sections ---
        const minPostLen = Math.min(post1.length, post2.length);
        for (let i = 0; i < minPostLen; i++) {
            const idx1 = post1.length - 1 - i;
            const idx2 = post2.length - 1 - i;
            bindings = unify(post1[idx1], post2[idx2], bindings, location);
            if (bindings === null) return null;
        }
        // Leftover post parts (from the beginning of the post arrays)
        const rem1_post = post1.slice(0, post1.length - minPostLen);
        const rem2_post = post2.slice(0, post2.length - minPostLen);

        // --- 3. Unify Remainders (Symmetrically) ---
        // Construct the pattern representing the middle part of p1
        const p1_middle_parts = [...rem1_pre, ...(rest1 ? [rest1] : []), ...rem1_post];
        const p1_remainder = new ArrayPattern(...p1_middle_parts);

        // Construct the pattern representing the middle part of p2
        const p2_middle_parts = [...rem2_pre, ...(rest2 ? [rest2] : []), ...rem2_post];
        const p2_remainder = new ArrayPattern(...p2_middle_parts);

        // Recursively unify the middle sections
        // This relies on the occurs check in the main 'unify' to terminate
        return unify(p1_remainder, p2_remainder, bindings, location);
    }

    // --- Core API methods ---

    [unifyTag](unify, value, bindings, location) {
        // Delegate to the shared template
        return unifyPattern(unify, this, value, bindings, location);
    }

    /**
     * Grounds the pattern based on the bindings.
     * Respects the original order of parts for JS spread semantics.
     * @param {function} ground - The main ground function.
     * @param {object} bindings - The solution bindings.
     * @returns {Array} The resulting grounded array.
     * @throws {Error} If a rest variable was bound to a non-array.
     */
    [groundTag](ground, bindings) {
        let finalArray = []; // Start with an empty array

        for (const part of this.parts) {
            // Recursively ground the current part
            const groundPart = ground(part, bindings);

            if (typeof groundPart === 'symbol') {
                // An unbound rest variable grounds to [], so it's a no-op
                continue;
            } else if (Array.isArray(groundPart)) {
                 // It's a concrete array (either a fixed part or a bound rest).
                 // Push its elements into the result.
                 finalArray.push(...groundPart);
            } else {
                 // This occurs if a rest variable (Symbol) was bound to
                 // something other than an array (e.g., an object or primitive).
                 throw new Error(`Cannot ground ArrayPattern: rest variable '${part.description}' was bound to non-array.`);
            }
        }
        return finalArray;
    }
}
