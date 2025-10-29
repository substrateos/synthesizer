import { unifyTag, groundTag, reprTag, symbolsTag } from "@/lib/logic/tags";

/**
 * Returns true if value is a plain JS object.
 */
function isPlainObject(value) {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof ObjectPattern);
}

/**
 * Flattens a 'parts' array into a single fixed-props object
 * and an array of spread variables, grounding any pre-bound variables.
 */
function flattenParts(ground, parts, bindings) {
    const fixedProps = {};
    const spreads = [];
    for (const part of parts) {
        if (!part) continue;

        // 'part' is the original term (e.g., Symbol('T') or {a: 1})
        // 'p' is the grounded value (e.g., "not_an_object" or {a: 1})
        const p = ground(part, bindings);

        if (typeof p === 'symbol') {
            spreads.push(p);
        } else if (p instanceof ObjectPattern) {
            // Recursively flatten pre-bound patterns
            const flat = flattenParts(ground, p.parts, bindings);
            Object.assign(fixedProps, flat.fixedProps);
            spreads.push(...flat.spreads);
        } else if (isPlainObject(p)) {
            Object.assign(fixedProps, p);
        } else {
            // This is the error case. `part` was a spread (Symbol)
            // but its grounded value `p` is not a valid object component.
            if (typeof part === 'symbol') {
                throw new Error(`Cannot ground ObjectPattern: spread variable '${part.description}' was bound to a non-object value.`);
            }
        }
    }
    return { fixedProps, spreads };
}

/**
 * Builds the simplest possible term (plain object, Symbol, or new ObjectPattern)
 * from a set of fixed properties and spreads.
 */
function buildPatternTerm(fixedProps, spreads, isExact = false) {
    const hasFixed = Object.keys(fixedProps).length > 0;

    if (spreads.length === 0) {
        // No spreads. Just a plain object.
        return fixedProps;
    }
    if (spreads.length === 1 && !hasFixed) {
        // One spread, no fixed keys. Just a Symbol.
        return spreads[0];
    }
    // A complex pattern is required.
    const parts = [];
    if (hasFixed) {
        parts.push(fixedProps);
    }
    parts.push(...spreads);
    return new ObjectPattern(parts, { isExact });
}

/**
 * Symmetrically unifies one pattern's spreads against the needs of the other.
 */
function unifySpreadsAgainstNeeds(unify, spreads, needs, bindings, location) {
    // Ground the 'needs' using the current bindings
    const flat_needs = flattenParts(unify.ground, [needs.fixedProps, ...needs.spreads], bindings);

    // Build the simplest possible term for what is needed
    // Needs are always "exact" in symmetric unification
    const needsTerm = buildPatternTerm(flat_needs.fixedProps, flat_needs.spreads, true);

    // Build the simplest possible term for the spreads we have
    const spreadsTerm = buildPatternTerm({}, spreads, true);

    // Unify them.
    return unify(spreadsTerm, needsTerm, bindings, location);
}

/**
 * Symmetrically unifies two ObjectPatterns.
 * This is for pattern-vs-pattern unification.
 */
function unifySymmetricPatterns(unify, parts1, parts2, bindings, location) {
    // Flatten both patterns
    const p1 = flattenParts(unify.ground, parts1, bindings);
    const p2 = flattenParts(unify.ground, parts2, bindings);

    const allKeys = new Set([...Object.keys(p1.fixedProps), ...Object.keys(p2.fixedProps)]);
    const p1_needs = { fixedProps: {}, spreads: [] }; // What p1's spreads must account for
    const p2_needs = { fixedProps: {}, spreads: [] }; // What p2's spreads must account for

    // Unify common fixed keys and sort remaining keys into 'needs'
    for (const key of allKeys) {
        const in1 = Object.hasOwn(p1.fixedProps, key);
        const in2 = Object.hasOwn(p2.fixedProps, key);

        if (in1 && in2) {
            // Common key: Unify values
            bindings = unify(p1.fixedProps[key], p2.fixedProps[key], bindings, location);
            if (bindings === null) return null;
        } else if (in1 && !in2) {
            // Key only in p1: p2's spreads must account for it
            p2_needs.fixedProps[key] = p1.fixedProps[key];
        } else if (!in1 && in2) {
            // Key only in p2: p1's spreads must account for it
            p1_needs.fixedProps[key] = p2.fixedProps[key];
        }
    }

    // Add the other pattern's spreads to our 'needs'
    p1_needs.spreads.push(...p2.spreads);
    p2_needs.spreads.push(...p1.spreads);

    // Cross-unify needs vs. spreads.
    bindings = unifySpreadsAgainstNeeds(unify, p1.spreads, p1_needs, bindings, location);
    if (bindings === null) return null;

    // Must use the *new* bindings from the first pass
    bindings = unifySpreadsAgainstNeeds(unify, p2.spreads, p2_needs, bindings, location);
    return bindings;
}

class ObjectPattern {
    /**
     * @param {Array<object|Symbol>} parts - An ordered list of pattern parts,
     * e.g., [ {a: 1}, Symbol('R'), {c: 3} ]
     * @param {object} options - Configuration options
     * @param {boolean} options.isExact - If true, requires an exact key match (no extra keys).
     */
    constructor(parts, { isExact = false } = {}) {
        this.parts = parts || [];
        this.isExact = isExact;
    }

    *[symbolsTag](symbols) {
        for (const part of this.parts) {
            if (typeof part === 'symbol') {
                yield part;
            } else {
                yield* symbols(part);
            }
        }
    }

    [reprTag](repr) {
        const partsStr = this.parts.map(part => {
            if (typeof part === 'symbol') {
                return `...${repr(part)}`;
            }
            if (isPlainObject(part)) {
                return Object.entries(part)
                    .map(([k, v]) => `${k}: ${repr(v)}`)
                    .join(', ');
            }
            return '';
        }).join(', ');
        return `{${partsStr}}`;
    }

    [unifyTag](unify, value, bindings, location) {
        // Pattern-vs-Pattern Unification
        if (value instanceof ObjectPattern) {
            // This still uses the symmetric helper, which is complex
            // but necessary for pattern-vs-pattern.
            return unifySymmetricPatterns(unify, this.parts, value.parts, bindings, location);
        }

        // Pattern-vs-Value Unification
        if (isPlainObject(value)) {
            // Flatten the pattern
            const flatPattern = flattenParts(unify.ground, this.parts, bindings);
            const fixedProps = flatPattern.fixedProps;
            const spreads = flatPattern.spreads;

            // Partition the value
            const restValue = {};
            const fixedValue = {};
            for (const key in value) {
                if (Object.hasOwn(fixedProps, key)) {
                    fixedValue[key] = value[key];
                } else {
                    restValue[key] = value[key];
                }
            }

            // Unify Fixed Keys
            for (const key in fixedProps) {
                if (!Object.hasOwn(fixedValue, key)) {
                    return null; // Key required by pattern is missing from value
                }
                bindings = unify(fixedProps[key], fixedValue[key], bindings, location);
                if (bindings === null) return null;
            }

            // Unify Spreads Deterministically
            if (spreads.length === 0) {
                // No spreads. Fail if 'isExact' and there are leftovers.
                if (this.isExact && Object.keys(restValue).length > 0) {
                    return null;
                }
            } else if (spreads.length === 1) {
                // 1 spread. It gets the *entire* rest.
                bindings = unify(spreads[0], restValue, bindings, location);
            } else {
                // 2+ spreads. Last one gets the rest, others get {}.
                const lastSpread = spreads[spreads.length - 1];
                for (let i = 0; i < spreads.length - 1; i++) {
                    bindings = unify(spreads[i], {}, bindings, location);
                    if (bindings === null) return null;
                }
                bindings = unify(lastSpread, restValue, bindings, location);
            }

            return bindings; // Success
        }

        return null; // Fail
    }

    /**
     * Grounds the pattern based on the bindings.
     */
    [groundTag](ground, bindings) {
        // Flatten all parts.
        const flat = flattenParts(ground, this.parts, bindings);

        // Build the simplest possible term from the grounded parts.
        return buildPatternTerm(flat.fixedProps, flat.spreads, this.isExact);
    }
}

export default ObjectPattern
