import {
    unifyTag,
    groundTag,
} from '@/lib/logic/tags'

/**
 * Recursively checks if a structure contains a specific symbol (the "occurs check").
 * @param {*} structure The data structure to search.
 * @param {Symbol} sym The symbol to search for.
 * @returns {boolean} True if the symbol is found within the structure.
 */
function contains(structure, sym) {
    if (structure === sym) return true;
    
    if (Array.isArray(structure)) {
        return structure.some(element => contains(element, sym));
    }
    
    if (typeof structure === 'object' && structure !== null) {
        return Object.values(structure).some(value => contains(value, sym));
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
        return { value: term, trace: [] };
    }

    // Get the binding for the current variable.
    const binding = bindings[term];
    const nextValue = binding.value;

    // Recursive step: Resolve the next value in the chain to get its
    // ultimate value and its own historical trace.
    const finalBinding = resolve(nextValue, bindings);
    
    return {
        value: finalBinding.value,
        trace: [...binding.trace, ...finalBinding.trace],
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

/**
 * The core unification function. It returns the new bindings object on success.
 * The trace information is built directly into the binding values.
 * @returns {object|null} The new bindings object, or null on failure.
 */
export default function unify(term1, term2, bindings, location) {
    const binding1 = resolve(term1, bindings);
    const binding2 = resolve(term2, bindings);
    const val1 = binding1.value;
    const val2 = binding2.value;

    if (val1 === val2) return bindings;

    if (typeof val1 === 'symbol') {
        if (contains(val2, val1)) return null; // Occurs check
        const event = { type: 'BIND', variable: val1, value: val2, location };
        const newTrace = [event, ...binding2.trace];
        return { ...bindings, [val1]: { value: val2, trace: newTrace } };
    }

    if (typeof val2 === 'symbol') {
        if (contains(val1, val2)) return null; // Occurs check
        const event = { type: 'BIND', variable: val2, value: val1, location };
        const newTrace = [event, ...binding1.trace];
        return { ...bindings, [val2]: { value: val1, trace: newTrace } };
    }

    if (val1 && typeof val1[unifyTag] === 'function') {
         return val1[unifyTag](unify, val2, bindings, location);
    }

    if (val2 && typeof val2[unifyTag] === 'function') {
        return val2[unifyTag](unify, val1, bindings, location);
    }

    if (Array.isArray(val1) && Array.isArray(val2)) {
        if (val1.length !== val2.length) return null;
        let currentBindings = bindings;
        for (let i = 0; i < val1.length; i++) {
            currentBindings = unify(val1[i], val2[i], currentBindings, location);
            if (currentBindings === null) return null;
        }
        return currentBindings;
    }

    if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
        if (val1.constructor !== val2.constructor) return null;

        // val1 is the pattern, val2 is the value.
        const patternKeys = Object.keys(val1);
        
        let currentBindings = bindings;
        for (const key of patternKeys) {
            // Fail if a key from the pattern does not exist in the value.
            if (!Object.hasOwn(val2, key)) {
                return null;
            }
            // Recursively unify the values for that key.
            currentBindings = unify(val1[key], val2[key], currentBindings, location);
            if (currentBindings === null) return null;
        }
        return currentBindings;
    }

    return null;
}
