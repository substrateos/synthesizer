import { unifyTag, groundTag, symbolsTag, _ } from "@/lib/logic/tags.js"
import Trace from '@/lib/logic/unify/Trace.js'
import Value from '@/lib/logic/unify/Value.js'
import repr from '@/lib/logic/repr.js'

/**
 * Recursively finds all unique symbols (logic variables) in a data structure.
 */
export function* symbols(term, visited = new Set(), symbolsRec) {
    if (!symbolsRec) {
        symbolsRec = function* (o) { yield* symbols(o, visited, symbolsRec) }
    }
    if (typeof term === 'symbol') {
        if (!visited.has(term)) {
            visited.add(term)
            yield term
        }
    } else if (Array.isArray(term)) {
        if (visited.has(term)) return; // Stop recursion if already visited
        visited.add(term);

        for (const element of term) {
            yield* symbolsRec(element)
        }
    } else if (typeof term === 'object' && term !== null) {
        if (visited.has(term)) return; // Stop recursion if already visited
        visited.add(term);

        if (symbolsTag in term) {
            yield* term[symbolsTag](symbolsRec)
        } else {
            for (const value of Object.values(term)) {
                yield* symbolsRec(value)
            }
        }
    }
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
 * Resolves a term by following a chain of bindings. It recursively reconstructs
 * the complete historical trace for the final value.
 *
 * @param {*} term - The term to resolve (can be any type, including a variable Symbol).
 * @param {object} bindings - The current bindings object, keyed by Symbols.
 * @returns {{value: *, trace: Array}} The final binding object for the term.
 */
export function resolve(term, bindings) {
    // Base case: If a term is not a variable or is unbound, it is its
    // own final value and has no history.
    if (typeof term !== 'symbol' || !Object.hasOwn(bindings, term)) {
        return { value: term, trace: Trace.empty };
    }

    // Get the binding for the current variable.
    const binding = bindings[term];

    // Recursive step: Resolve the next value in the chain to get its
    // ultimate value and its own historical trace.
    const finalBinding = resolve(binding.value, bindings);

    return {
        value: finalBinding.value,
        trace: Trace.concat(binding.trace, finalBinding.trace),
    };
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

export function bind(selfBinding, otherBinding, bindings, location) {
    const sym = selfBinding.value
    const value = otherBinding.value
    // Anonymous variables never bind
    if (sym === _ || value === _) {
        return bindings
    }
    // console.log('bind', sym, '=', value, {location, trace: otherBinding.trace})

    // Check if sym exists inside the value we trying to bind to.
    if (contains(value, sym)) { return null; }

    const event = { type: 'BIND', variable: sym, value, location };
    const trace = Trace.concat(
        Trace.of(event),
        Trace.concat(selfBinding.trace, otherBinding.trace),
    );

    return {
        ...bindings,
        [sym]: { value, trace },
    };
}

/**
 * The core unification function. It returns the new bindings object on success.
 * The trace information is built directly into the binding values.
 * @returns {object|null} The new bindings object, or null on failure.
 */
export default function unify(term1, term2, bindings, location) {
    // const repr1 = repr(term1)
    // const repr2 = repr(term2)
    // console.log('unify(', repr1, ',', repr2, ')', '...')

    // if (repr1 === '{}' && repr2 === 'Z') {
    //     debugger
    // }

    let newBindings = unify0(term1, term2, bindings, location)
    // console.log('unify(', repr1, ',', repr2, ')', '->', newBindings, { term1, term2, bindings, location })
    return newBindings
}

function unifyResolved(b1, b2, bindings, location) {
    // const repr1 = repr(b1.value)
    // const repr2 = repr(b2.value)
    // console.log('unifyResolved(', repr1, ',', repr2, ')', '...')

    // if (repr1 === '{}' && repr2 === 'Z') {
    //     debugger
    // }

    let newBindings = unifyResolved0(b1, b2, bindings, location)
    // console.log('unifyResolved(', repr1, ',', repr2, ')', '->', newBindings, { term1, term2, bindings, location })
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
    return unifyResolved0(
        resolve(term1, bindings),
        resolve(term2, bindings),
        bindings,
        location,
    );
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
    unifyResolved,
    symbols,
    isGround,
    resolve,
    bind,
    walk,
    ground,
})
