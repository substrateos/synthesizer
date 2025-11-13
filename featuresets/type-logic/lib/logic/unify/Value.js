import { unifyTag, groundTag, symbolsTag, reprTag } from "@/lib/logic/tags.js";

export default class Value {
    static isOptional(o) {
        if (o instanceof Value) {
            return o.isOptional
        }
        return false
    }

    static optional(left, right) {
        return new Value(left, right, true)
    }

    static required(left, right) {
        return new Value(left, right, false)
    }

    constructor(left, right, isOptional) {
        this.left = left;
        this.right = right;
        this.location = {}
        this.isOptional = isOptional;
    }

    [unifyTag](unify, otherBinding, bindings, location, selfBinding) {
        const value = otherBinding.value

        // Case 0: Value vs Value (Symmetric Unification)
        if (value instanceof Value) {
            // Link the variables (The slots are the same)
            bindings = unify(this.left, value.left, bindings, location);
            if (bindings === null) return null;

            if (!this.isOptional && !value.isOptional) {
                // Both Required: Variable must match both defaults.
                bindings = unify(this.left, this.right, bindings, location);
                if (bindings === null) return null;
                return unify(this.left, value.right, bindings, location);
            }
            else if (!this.isOptional) {
                // This Required: Variable must match this default.
                // Other is Optional: It accepts the result.
                return unify(this.left, this.right, bindings, location);
            }
            else if (!value.isOptional) {
                // Other Required: Variable must match other default.
                return unify(this.left, value.right, bindings, location);
            }
            else {
                // Both Optional.
                // If they are consistent, it works. If not, it fails.

                // We bind the Variable to THIS default.
                bindings = unify(this.left, this.right, bindings, location);
                if (bindings === null) return null;

                // We ALSO bind the Variable to the OTHER default.
                // This ensures consistency (99 vs 99 ok, 99 vs 50 fails).
                return unify(this.left, value.right, bindings, location);
            }
        }

        // Case 1: Value is MISSING (undefined).
        if (value === undefined) {
            if (this.isOptional) {
                // Soft default: succeeds, binds the default.
                return unify(this.left, this.right, bindings, location);
            } else {
                // Hard default: fails.
                return null;
            }
        }

        // Case 2: A value *was* provided (e.g., null, 10, or a variable).
        // First, unify the variable (left) with the provided value (value).
        const left = unify.resolve(this.left, bindings)
        bindings = unify.unifyResolved(left, otherBinding, bindings, location);
        if (bindings === null) return null;

        // Handle Variable vs. Default interactions
        if (typeof value !== 'symbol' && this.isOptional) {
            // We have a concrete value (not a variable) and we are optional.
            // The concrete value overrides the default. Success.
            return bindings;
        } else {
            // We matched a Variable (symbol) OR we are Required.
            // In both cases, we enforce the default/assertion.
            // If Optional vs Variable: Aggressive Default (bind variable to default).
            // If Required vs Anything: Assertion (ensure value matches constraint).

            bindings = unify(this.left, this.right, bindings, location);
            if (bindings === null) return null;

            const right = unify.resolve(this.right, bindings)
            return unify.unifyResolved(otherBinding, right, bindings, location);
        }
    }

    [groundTag](ground, bindings) {
        return new Value(ground(this.left, bindings), ground(this.right, bindings), this.isOptional);
    }

    *[symbolsTag](symbols) {
        yield* symbols(this.left);
        yield* symbols(this.right);
    }

    [reprTag](repr) {
        if (this.isOptional) {
            return `${repr(this.left)} = Logic.optional(${repr(this.right)})`;
        }
        return `${repr(this.left)} = ${repr(this.right)}`;
    }
}