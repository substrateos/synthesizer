import { unifyTag, groundTag, reprTag } from "@/lib/logic/tags";
import unifyPattern from "@/lib/logic/unify/pattern";

export default class ObjectPattern {

    constructor(...parts) {
        this.parts = parts;
    }

    isConcreteType(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    getConcreteValue(canonical) {
        return canonical.fixedProps;
    }

    reduce(resolve, bindings) {
        const fixedProps = {};
        const restVars = [];
        const unboundRestSymbols = []; // For ambiguity check

        for (const part of this.parts) {
            if (typeof part === 'symbol') {
                const { value: resolvedPart } = resolve(part, bindings);
                if (typeof resolvedPart === 'symbol') {
                    // Check for ambiguity
                    if (unboundRestSymbols.length > 0) {
                         const existingNames = unboundRestSymbols.map(s => `'${s.description}'`).join(', ');
                         throw new Error(`ObjectPattern is ambiguous: more than one rest variable (${existingNames}, '${resolvedPart.description}') is unbound.`);
                    }
                    restVars.push(resolvedPart);
                    unboundRestSymbols.push(resolvedPart);
                // } else {
                //     if (!this.isConcreteType(resolvedPart)) throw new Error(`ObjectPattern rest variable '${part.description}' was bound to a non-object value.`);
                //     Object.assign(fixedProps, resolvedPart);
                }
            } else {
                Object.assign(fixedProps, part);
            }
        }
        return { fixedProps, restVars };
    }

    unifyWithConcrete(unify, canonical, value, bindings, location) {
        const { fixedProps, restVars } = canonical;
        const valueKeys = new Set(Object.keys(value));

        for (const key in fixedProps) {
            if (!Object.hasOwn(value, key)) return null;
            bindings = unify(fixedProps[key], value[key], bindings, location);
            if (bindings === null) return null;
            valueKeys.delete(key);
        }

        const restObj = {};
        for (const key of valueKeys) restObj[key] = value[key];

        if (restVars.length === 0) {
            // No rest variable in the pattern. Succeed only if no extra keys in value.
            if (Object.keys(restObj).length === 0) {
                return bindings; // Success, exact match
            } else {
                return null; // Pattern has no rest, but value has extra keys -> Fail
            }
        } else if (restVars.length === 1) {
            // Exactly one rest variable. Unify it with the remaining properties.
            const restVar = restVars[0];
            return unify(restVar, restObj, bindings, location); // Unify the single rest variable
        } else {
            // Multiple unbound rests detected during unification.
            // This indicates an ambiguity that should ideally be caught earlier by reduce.
            // For safety, we fail here. Consider adding an explicit check in reduce.
            // NOTE: If reduce is updated, this else might become unreachable.
            // console.warn("Ambiguity detected during ObjectPattern unification (multiple unbound rests)."); // Optional warning
            return null; // Fail due to ambiguity
        }
    }

    unifyWithPattern(unify, p1, p2, bindings, location) {
        const p1_fixed = p1.fixedProps, p2_fixed = p2.fixedProps;
        const p1_rests = p1.restVars, p2_rests = p2.restVars;

        const allKeys = new Set([...Object.keys(p1_fixed), ...Object.keys(p2_fixed)]);
        const p1_rest_props = {}, p2_rest_props = {};

        for (const key of allKeys) {
            const in1 = Object.hasOwn(p1_fixed, key);
            const in2 = Object.hasOwn(p2_fixed, key);

            if (in1 && in2) {
                bindings = unify(p1_fixed[key], p2_fixed[key], bindings, location);
            } else if (in1 && !in2) {
                if (p2_rests.length === 0) return null;
                p2_rest_props[key] = p1_fixed[key];
            } else if (!in1 && in2) {
                if (p1_rests.length === 0) return null;
                p1_rest_props[key] = p2_fixed[key];
            }
            if (bindings === null) return null;
        }

        // p1_needs: Everything p1's rests must account for.
        // This includes the fixed props ONLY in p2, plus ALL of p2's rests.
        const p1_needs = new ObjectPattern([p2_rest_props, ...p2_rests]);

        // p2_needs: Symmetrically, everything p2's rests must account for.
        const p2_needs = new ObjectPattern([p1_rest_props, ...p1_rests]);

        // Create temporary patterns representing just the rests of each pattern.
        // e.g., if p1 was {a:1, ...R, ...S}, this is {...R, ...S}
        const p1_rest_pattern = new ObjectPattern(p1_rests);
        const p2_rest_pattern = new ObjectPattern(p2_rests);

        // Symmetrically unify:
        // Does p1's rests satisfy p2's needs?
        bindings = unify(p1_rest_pattern, p2_needs, bindings, location);
        if (bindings === null) return null;

        // Does p2's rests satisfy p1's needs?
        return unify(p2_rest_pattern, p1_needs, bindings, location);
    }

    [reprTag](repr) {
        return `{${this.parts.map(part => {
            if (typeof part === 'symbol') {
                return `...${repr(part)}`
            }
            return Object.entries(part).map(([k,v]) => `${k}: ${repr(v)}`).join(', ');
        }).join(", ")}}`
    }

    [unifyTag](unify, value, bindings, location) {
        return unifyPattern(unify, this, value, bindings, location);
    }

    /**
     * Grounds the pattern based on the bindings.
     * Respects the original order of parts for JS spread semantics.
     * @param {function} ground - The main ground function.
     * @param {object} bindings - The solution bindings.
     * @returns {object} The resulting grounded object.
     * @throws {Error} If a rest variable was bound to a non-object.
     */
    [groundTag](ground, bindings) {
        let finalObj = {}; // Start with an empty object

        for (const part of this.parts) {
            // Recursively ground the current part
            const groundPart = ground(part, bindings);

            if (typeof groundPart === 'symbol') {
                // An unbound rest variable grounds to {}, so it's a no-op
                continue;
            } else if (this.isConcreteType(groundPart)) {
                // It's a concrete object (either a fixed part or a bound rest).
                // Spread its properties into the result. This handles
                // the order-dependent overwriting correctly.
                finalObj = { ...finalObj, ...groundPart };
            } else {
                // This occurs if a rest variable (Symbol) was bound to
                // something other than an object (e.g., an array or primitive).
                // The unification step should ideally prevent this, but
                // we add a safeguard here.
                throw new Error(`Cannot ground ObjectPattern: rest variable '${part.description}' was bound to non-object.`);
            }
        }
        return finalObj;
    }
}
