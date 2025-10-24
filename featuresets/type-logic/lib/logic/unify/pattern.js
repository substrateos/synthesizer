import { resolve } from "@/lib/logic/unify"; 

/**
 * The high-level "template method" for pattern unification.
 * Called by ArrayPattern and ObjectPattern's [unifyTag].
 * @param {function} unify - The main unify function.
 * @param {BasePattern} p1_instance - The pattern instance (this).
 * @param {*} value - The value to unify against.
 * @param {object} bindings - The current bindings.
 * @param {object} location - Source location.
 */
export default function unifyPattern(unify, p1_instance, value, bindings, location) {
    // Reduce this pattern (p1)
    let p1_canonical;

    // Call the instance's reduce method
    p1_canonical = p1_instance.reduce(unify.resolve, bindings); 

    // Check if p1 is "concrete" (fully bound)
    const p1_is_concrete = p1_canonical.rest === null || (p1_canonical.restVars && p1_canonical.restVars.length === 0);
    
    if (p1_is_concrete) {
        // p1 is concrete. Build the plain value and delegate back to main unify.
        const p1_value = p1_instance.getConcreteValue(p1_canonical);
        return unify(p1_value, value, bindings, location);
    }

    // p1 is an unbound pattern. We must check value.
    // Use constructor property to check if value is the same type of pattern
    if (value instanceof p1_instance.constructor) { 
        // Case 1: value is another Pattern of the same type (Pattern vs Pattern)
        let p2_canonical;

        // Call the other instance's reduce method
        p2_canonical = value.reduce(unify.resolve, bindings); 
        
        const p2_is_concrete = p2_canonical.rest === null || (p2_canonical.restVars && p2_canonical.restVars.length === 0);

        if (p2_is_concrete) {
            // p1 is unbound, but p2 is concrete.
            const p2_value = value.getConcreteValue(p2_canonical);
            // Call p1's concrete unifier
            return p1_instance.unifyWithConcrete(unify, p1_canonical, p2_value, bindings, location); 
        } else {
            // Both are unbound patterns. Call p1's Pattern vs Pattern unifier
            return p1_instance.unifyWithPattern(unify, p1_canonical, p2_canonical, bindings, location); 
        }
    
    } else if (p1_instance.isConcreteType(value)) {
        // Case 2: value is a plain type (Pattern vs Value)
        // Call p1's concrete unifier
        return p1_instance.unifyWithConcrete(unify, p1_canonical, value, bindings, location); 
    
    } else {
        return null; // Not a compatible type
    }
}
