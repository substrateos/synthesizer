import { unifyTag, groundTag, _ } from "@/lib/logic/tags.js"
import symbols from '@/lib/logic/unify/symbols.js'
import Trace from '@/lib/logic/unify/Trace.js'
import Value from '@/lib/logic/unify/Value.js'
import repr from '@/lib/logic/repr.js'
import flatten from "@/lib/logic/unify/flatten.js"

/**
 * Creates a new bindings object that inherits from the same prototype 
 * as the original, preserving the scope chain.
 */
export function mergeBindings(original, updates) {
    return Object.assign(
        Object.create(Object.getPrototypeOf(original)),
        original,
        updates,
    );
}

/**
 * Checks if a term is "ground" (i.e., contains no unbound variables).
 * @param {*} term - The term to check.
 * @returns {boolean} True if the term is ground, false otherwise.
 */
export function isGround(term) {
    for (const symbol of symbols(term)) {
        return false
    }
    return true
}

/**
 * Returns a list of active constraints for a given variable.
 * @param {*} term - The variable (or value) to inspect.
 * @param {Object} bindings - The current bindings.
 * @returns {Array} List of constraint objects { fn, args, location }.
 */
export function constraints(term, bindings) {
    const { value, trace } = resolve(term, bindings);

    // If the term resolved to a concrete value, it has no pending constraints.
    if (typeof value !== 'symbol' || !trace) return [];

    const result = [];
    const seen = new Set();

    for (const event of trace) {
        if (event.type === 'CONSTRAINT' && !seen.has(event)) {
            seen.add(event);

            // Resolve the arguments against the *current* bindings to give
            // the user the most up-to-date view of the constraint.
            const currentArgs = event.args.map(a => resolve(a, bindings).value);

            result.push({
                fn: event.fn,
                args: currentArgs,
                location: event.location
            });
        }
    }

    return result;
}

/**
 * Recursively checks if a structure contains a specific symbol (the "occurs check").
 * @param {*} structure The data structure to search.
 * @param {Symbol} sym The symbol to search for.
 * @returns {boolean} True if the symbol is found within the structure.
 */
function contains(structure, sym) {
    for (const symbol of symbols(structure)) {
        if (symbol === sym) return true;
    }

    return false;
}

/**
 * Applies a constraint based on a native JS function.
 * @param {Object} bindings - Current bindings.
 * @param {Function} fn - The function defining the logic (e.g., (a,b) => a > b).
 * @param {Array} args - The list of arguments (Variables or Values) to pass to fn.
 * @param {Object} location - Source location for debugging.
 */
export function constrain(bindings, fn, args, location) {
    // Resolve all arguments once
    const resolvedArgs = new Array(args.length);
    const unboundVars = new Set();
    let isFullyGround = true;

    for (let i = 0; i < args.length; i++) {
        const { value } = resolve(args[i], bindings);
        resolvedArgs[i] = value;

        if (typeof value === 'symbol') {
            unboundVars.add(value);
            isFullyGround = false;
        }
    }

    if (isFullyGround) {
        return fn(...resolvedArgs) ? bindings : null;
    }

    // Deferral
    const constraintEvent = {
        type: 'CONSTRAINT',
        fn,
        args, // Store original args so future checks resolve against future bindings
        location,
        check: (val, b, boundSym) => {
            const currentArgs = [];
            let stillUnbound = false;

            for (let i = 0; i < args.length; i++) {
                // 1. Check the symbol currently being bound (Fastest)
                if (args[i] === boundSym) {
                    currentArgs.push(val);
                    continue;
                }

                // Resolve against current bindings
                const r = resolve(args[i], b).value;

                // Handle aliasing (if args[i] pointed to boundSym)
                if (r === boundSym) {
                    currentArgs.push(val);
                } else {
                    currentArgs.push(r);
                }

                if (typeof currentArgs[currentArgs.length - 1] === 'symbol') {
                    stillUnbound = true;
                }
            }

            if (stillUnbound) return true; // Defer again

            return fn(...currentArgs);
        },
    };

    // Collect all updates into one object to prevent prototype chain thrashing.
    const updates = {};

    for (const sym of unboundVars) {
        let trace = Trace.empty;

        // If the variable is already in the bindings (local or proto)
        // we need to preserve its existing trace.
        if (sym in bindings) {
            const entry = bindings[sym];
            if (entry.value === sym) { // only strictly unbound vars keep traces
                trace = entry.trace;
            }
        }

        updates[sym] = {
            value: sym,
            trace: Trace.concat(trace, Trace.of(constraintEvent))
        };
    }

    // Single allocation for the new scope
    return mergeBindings(bindings, updates);
}

/**
 * Resolves a term to its current value (or itself if unbound).
 * Iterative implementation optimized for V8.
 */
export function resolve(term, bindings) {
    if (typeof term !== 'symbol') {
        return { value: term, trace: Trace.empty };
    }

    let binding = bindings[term];
    if (binding === undefined) {
        return { value: term, trace: Trace.empty };
    }

    // We iterate as long as the binding points to a *different* symbol.
    // If it points to a value, itself, or a missing symbol, we stop.
    while (typeof binding.value === 'symbol' && binding.value !== term) {
        const nextTerm = binding.value;
        const nextBinding = bindings[nextTerm];

        // Edge Case: Points to a symbol not in bindings (treat as value)
        if (nextBinding === undefined) {
            break;
        }

        term = nextTerm;
        binding = nextBinding;
    }

    return binding;
}

/**
 * Recursively "grounds" a term by replacing all nested logic variables
 * with their fully resolved values from the bindings object.
 * @param {*} term - The term or data structure to ground.
 * @param {object} bindings - The final bindings from the solver.
 * @returns {*} A copy of the term with all variables fully resolved.
 */
export function ground(term, bindings) {
    // First, resolve the top-level term to its final value.
    const { value } = resolve(term, bindings);

    // Check if the value has a custom grounding function.
    if (value && typeof value[groundTag] === 'function') {
        return value[groundTag](ground, bindings);
    }

    // Now, recursively walk the resolved value to ground any nested variables.
    if (Array.isArray(value)) {
        return value.map(item => ground(item, bindings));
    }

    // Ensure we only recurse on plain objects, not special class instances.
    if (typeof value === 'object' && value !== null && value.constructor === Object) {
        const newObj = {};
        for (const key in value) {
            newObj[key] = ground(value[key], bindings);
        }
        return newObj;
    }

    // It's a primitive (or a class instance), so it's fully grounded.
    return value;
}

/**
 * Binds a variable to a concrete value.
 * Validates the entire accumulated trace against the new value.
 */
export function bind(selfBinding, otherBinding, bindings, location) {
    // const repr1 = repr(selfBinding.value)
    // const repr2 = repr(otherBinding.value)
    // console.log('bind(', repr1, ',', repr2, ')')

    const sym = selfBinding.value;
    const value = otherBinding.value;

    if (sym === _ || value === _) return bindings;
    if (contains(value, sym)) return null; // Occurs check

    if (typeof value === 'symbol') {
        // Target inherits Source's history (Target + Source)
        const combinedTrace = Trace.concat(
            selfBinding.trace,
            otherBinding.trace,
        );

        // Source becomes a simple pointer (Link)
        // It no longer needs its old constraints because they are now active on the Target.
        const linkTrace = Trace.of({ type: 'BIND', variable: value, value: sym, location });

        return mergeBindings(bindings, {
            [sym]: { value, trace: linkTrace },
            [value]: { value, trace: combinedTrace }
        });
    }

    if (selfBinding.trace) {
        for (const event of selfBinding.trace) {
            if (event.check) {
                if (!event.check(value, bindings, sym)) {
                    return null; // Constraint Violation
                }
            }
        }
    }

    const linkTrace = Trace.concat(
        Trace.of({ type: 'BIND', variable: sym, value, location }),
        Trace.concat(selfBinding.trace, otherBinding.trace),
    );

    return mergeBindings(bindings, {
        [sym]: { value, trace: linkTrace },
    });
}

export default function unify(term1, term2, bindings, location) {
    // const repr1 = repr(term1)
    // const repr2 = repr(term2)
    // console.log('unify(', repr1, ',', repr2, ')', '...')
    // if (repr1 === '{a: a = 10}' && repr2 === '_') {
    //     debugger
    // }


    const newBindings = unify0(term1, term2, bindings, location);
    // console.log('unify(', repr1, ',', repr2, ')', '->', newBindings, { term1, term2, bindings, location })
    return newBindings
}

function unifyResolved(b1, b2, bindings, location) {
    // const repr1 = repr(b1.value)
    // const repr2 = repr(b2.value)
    // console.log('unifyResolved(', repr1, ',', repr2, ')', '...')

    let newBindings = unifyResolved0(b1, b2, bindings, location)
    // console.log('unifyResolved(', repr1, ',', repr2, ')', '->', newBindings, { b1, b2, bindings, location })
    return newBindings
}

function walk(term, bindings, location) {
    if (!term || typeof term !== 'object') {
        return bindings
    }

    if (Array.isArray(term)) {
        for (const element of term) {
            // we unify with an anonymous symbol so we can recurse as needed
            bindings = unify(element, _, bindings, location)
            if (bindings === null) { return null; }
        }
        return bindings
    }

    if (term.constructor === Object) {
        for (const key in term) {
            // we unify with an anonymous symbol so we can recurse as needed
            bindings = unify(term[key], _, bindings, location)
            if (bindings === null) { return null; }
        }
        return bindings
    }

    return bindings
}

function unify0(term1, term2, bindings, location) {
    const r1 = resolve(term1, bindings);
    const r2 = resolve(term2, bindings);
    return unifyResolved0(r1, r2, bindings, location);
}

function unifyResolved0(b1, b2, bindings, location) {
    const v1 = b1.value;
    const v2 = b2.value;

    if (v1 === v2) return bindings;

    // Some types of unification must be higher priority than symbol binding.
    if (v1 && typeof v1[unifyTag] === 'function') {
        return v1[unifyTag](unify, b2, bindings, location, b1);
    }

    if (v2 && typeof v2[unifyTag] === 'function') {
        return v2[unifyTag](unify, b1, bindings, location, b2);
    }

    if (Array.isArray(v1) && Array.isArray(v2)) {
        if (v1.length !== v2.length) { return null; }
        for (let i = 0; i < v1.length; i++) {
            bindings = unify(v1[i], v2[i], bindings, location);
            if (bindings === null) { return null; }
        }
        return bindings;
    }

    if (typeof v1 === 'object' && v1 !== null && typeof v2 === 'object' && v2 !== null) {
        if (v1.constructor !== v2.constructor) { return null; }

        // Iterate keys in V1
        for (const key of Object.keys(v1)) {
            const val1 = v1[key];
            if (Object.hasOwn(v2, key)) {
                // Key exists in both: Unify their values
                bindings = unify(val1, v2[key], bindings, location);
            } else {
                // Key in V1 but not V2.
                // Strictness: If val1 is a variable/object/array/primitive, we FAIL.
                // We ONLY allow missing keys if val1 is an instance of Value (which handles defaults).
                const { value: r1 } = resolve(val1, bindings);
                if (!(r1 instanceof Value)) {
                    return null;
                }
                bindings = unify(val1, undefined, bindings, location);
            }
            if (bindings === null) return null;
        }

        // Iterate keys in V2, checking only for those MISSING in V1
        for (const key of Object.keys(v2)) {
            if (!Object.hasOwn(v1, key)) {
                // Key in V2 but not V1.
                const val2 = v2[key];
                const { value: r2 } = resolve(val2, bindings);
                if (!(r2 instanceof Value)) {
                    return null;
                }
                bindings = unify(undefined, val2, bindings, location);
                if (bindings === null) return null;
            }
        }
        return bindings;
    }

    if (typeof v1 === 'symbol') {
        bindings = bind(b1, b2, bindings, location)
        if (bindings === null) { return null; }
        return walk(v2, bindings, location)
    }

    if (typeof v2 === 'symbol') {
        bindings = bind(b2, b1, bindings, location)
        if (bindings === null) { return null; }
        return walk(v1, bindings, location)
    }

    return null;
}

Object.assign(unify, {
    bind,
    constrain,
    constraints,
    ground,
    isGround,
    resolve,
    symbols,
    flatten,
    unifyResolved,
    walk,
    mergeBindings,
});
