import { unifyTag, groundTag, reprTag, symbolsTag, _ } from "@/lib/logic/tags.js";
import Value from "@/lib/logic/unify/Value.js";

/**
 * Returns true if value is a plain JS object.
 */
function isPlainObject(value) {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof ObjectPattern) &&
        !(value instanceof Value);
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
            if (p instanceof Value) {
                throw new Error(`Cannot ground ObjectPattern: Value not allowed as a pattern part.`);
            }
        }
    }
    return { fixedProps, spreads };
}

/**
 * Builds the simplest possible term (plain object, Symbol, or new ObjectPattern)
 * from a set of fixed properties and spreads.
 */
function buildPatternTerm(fixedProps, spreads) {
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
    return ObjectPattern.from(parts);
}

/**
 * Symmetrically unifies one pattern's spreads against the needs of the other.
 */
function unifySpreadsAgainstNeeds(unify, spreads, needs, bindings, location) {
    // Ground the 'needs' using the current bindings
    const flat_needs = flattenParts(unify.ground, [needs.fixedProps, ...needs.spreads], bindings);

    // Build the simplest possible term for what is needed
    // Needs are always "exact" in symmetric unification
    const needsTerm = buildPatternTerm(flat_needs.fixedProps, flat_needs.spreads);

    // Build the simplest possible term for the spreads we have
    const spreadsTerm = buildPatternTerm({}, spreads);

    // console.log('unifySpreadsAgainstNeeds', {needsTerm, spreadsTerm, flat_needs, unify, spreads, needs, bindings})

    // Unify them.
    return unify(spreadsTerm, needsTerm, bindings, location);
}

/**
 * Checks if a set of "needed" properties can be satisfied by `undefined`.
 * This is used when one side is CLOSED (no spread) and therefore cannot absorb extra keys.
 * The only way it succeeds is if the extra keys are Optional Values.
 */
function processClosedNeeds(unify, needs, bindings, location) {
    // If there are needed spreads, a closed object definitely fails.
    if (needs.spreads.length > 0) return null;
    
    // For fixed properties, try to unify them with `undefined`.
    // This allows `Value.optional(..., default)` to succeed.
    for (const key in needs.fixedProps) {
        bindings = unify(needs.fixedProps[key], undefined, bindings, location);
        if (bindings === null) return null;
        // If successful, remove the key from needs so we don't try to spread it later (though we won't reach spread logic anyway)
        delete needs.fixedProps[key];
    }
    return bindings;
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
    
    // p1_needs: What P1 lacks but P2 has.
    const p1_needs = { fixedProps: {}, spreads: [] }; 
    
    // p2_needs: What P2 lacks but P1 has.
    const p2_needs = { fixedProps: {}, spreads: [] }; 

    // Unify common fixed keys and sort remaining keys into 'needs'
    for (const key of allKeys) {
        const in1 = Object.hasOwn(p1.fixedProps, key);
        const in2 = Object.hasOwn(p2.fixedProps, key);

        if (in1 && in2) {
            // Common key: Unify values
            bindings = unify(p1.fixedProps[key], p2.fixedProps[key], bindings, location);
            if (bindings === null) return null;
        } else if (in1 && !in2) {
            // P1 has it, P2 needs it
            p2_needs.fixedProps[key] = p1.fixedProps[key];
        } else if (!in1 && in2) {
            // P2 has it, P1 needs it
            p1_needs.fixedProps[key] = p2.fixedProps[key];
        }
    }

    const hasSpreads1 = p1.spreads.length > 0;
    const hasSpreads2 = p2.spreads.length > 0;

    // Handle Closed Objects ("Needs" must be satisfied by Optional Defaults)
    if (!hasSpreads1) {
        // P1 is closed. It cannot absorb p1_needs.
        bindings = processClosedNeeds(unify, p1_needs, bindings, location);
        if (bindings === null) return null;
    }
    
    if (!hasSpreads2) {
        // P2 is closed. It cannot absorb p2_needs.
        bindings = processClosedNeeds(unify, p2_needs, bindings, location);
        if (bindings === null) return null;
    }

    // Solve for Spreads (if any exist)
    if (hasSpreads1 && hasSpreads2) {
        // Case A: Both are "open". Introduce Pivot.
        const Pivot = Symbol('Pivot');

        p1_needs.spreads.push(Pivot);
        bindings = unifySpreadsAgainstNeeds(unify, p1.spreads, p1_needs, bindings, location);
        if (bindings === null) return null;

        p2_needs.spreads.push(Pivot);
        bindings = unifySpreadsAgainstNeeds(unify, p2.spreads, p2_needs, bindings, location);

    } else if (hasSpreads1) {
        // Case B: Only P1 is open. P1 absorbs p1_needs.
        // Note: p2_needs must be empty here because we processed it in step 2.
        // If p2_needs had leftovers, processClosedNeeds would have failed or cleared them.
        
        // p1_needs absorbs P2's spreads (which should be empty if hasSpreads2 is false, but consistent logic)
        p1_needs.spreads.push(...p2.spreads);
        bindings = unifySpreadsAgainstNeeds(unify, p1.spreads, p1_needs, bindings, location);

    } else if (hasSpreads2) {
        // Case C: Only P2 is open.
        p2_needs.spreads.push(...p1.spreads);
        bindings = unifySpreadsAgainstNeeds(unify, p2.spreads, p2_needs, bindings, location);
    } 
    // Case D: Both closed. We already handled validation in Step 2.
    // If we are here, bindings is valid.

    return bindings;
}

class ObjectPattern {
    static from(parts) {
        if (parts.length === 1) {
            const part = parts[0]
            if (typeof part === 'symbol' || (!Object.values(part).some(part => part instanceof Value))) {
                return part
            }
        }

        return new ObjectPattern(parts)
    }

    /**
     * @param {Array<object|Symbol>} parts - An ordered list of pattern parts,
     * e.g., [ {a: 1}, Symbol('R'), {c: 3} ]
     */
    constructor(parts) {
        this.parts = parts;
    }

    *[symbolsTag](symbols) {
        for (const part of this.parts) {
            yield* symbols(part);
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

    [unifyTag](unify, otherBinding, bindings, location, selfBinding) {
        const value = otherBinding.value
        if (typeof value === 'symbol') {
            bindings = unify.bind(otherBinding, selfBinding, bindings, location)
            if (bindings === null) return null;
        }

        // Pattern-vs-Pattern Unification
        if (value instanceof ObjectPattern) {
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
                const patternValue = fixedProps[key];
                if (!Object.hasOwn(fixedValue, key)) {
                    // Key is missing. Check if the pattern part is a Value.
                    const { value: resolvedPatternV } = unify.resolve(patternValue, bindings);
                    if (resolvedPatternV instanceof Value) {
                        // It's a Value, so it can handle being missing.
                        bindings = unify(resolvedPatternV, undefined, bindings, location);
                        if (bindings === null) return null;
                    } else {
                        // Not a Value instance. This is a hard failure.
                        return null;
                    }
                } else {
                    // Key exists. Unify normally.
                    bindings = unify(patternValue, fixedValue[key], bindings, location);
                    if (bindings === null) return null;
                }
            }

            // Unify Spreads Deterministically
            if (spreads.length === 0) {
                // No spreads. Fail if there are leftovers.
                if (Object.keys(restValue).length > 0) {
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

        if (typeof value === 'symbol') {
            return unify.walk(this.parts, bindings, location)
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
        return buildPatternTerm(flat.fixedProps, flat.spreads);
    }
}

export default ObjectPattern
