import createVars from "@/lib/logic/vars.js";
import unify from "@/lib/logic/unify.js";
import { unifyTag } from "@/lib/logic/tags.js";
import ArrayPattern from "@/lib/logic/unify/ArrayPattern.js";
import ObjectPattern from "@/lib/logic/unify/ObjectPattern.js";
import Value from "@/lib/logic/unify/Value.js";

// This helper is now passed the library to properly serialize constraints.
function serialize(data, library) {
    if (data === null) return null;
    if (typeof data === 'symbol') {
        return { '$var': data.description };
    }
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) {
        return data.map(item => serialize(item, library));
    }
    if (Symbol.iterator in data) {
        return Array.from(data, item => serialize(item, library))
    }
    if (data instanceof Value) {
        const key = data.isOptional ? '$optional' : '$required';
        return { [key]: [data.left, data.right].map(serialize) };
    }
    if (data instanceof ArrayPattern) {
        return { '$class': 'ArrayPattern', 'args': data.parts.map(serialize) };
    }
    if (data instanceof ObjectPattern) {
        return { '$class': 'ObjectPattern', 'args': data.parts.map(serialize) };
    }
    if (data instanceof ObjectPattern) {
        // Serialize 'isExact' only if it's true
        const serialized = {
            '$class': 'ObjectPattern',
            'args': data.parts.map(serialize)
        };
        if (data.isExact) {
            serialized.isExact = true;
        }
        return serialized;
    }
    // Check if this object is a custom unifier/constraint.
    if (data[unifyTag] && library?.constraints) {
        for (const name in library.constraints) {
            // Compare the unification functions to find the constraint's name.
            if (Object.hasOwn(library.constraints, name) && library.constraints[name][unifyTag] === data[unifyTag]) {
                return { '$constraint': name };
            }
        }
    }

    const newObj = {};
    for (const key of Reflect.ownKeys(data)) {
        const newKey = typeof key === 'symbol' ? key.description : key;
        newObj[newKey] = serialize(data[key], library);
    }
    return newObj;
}

// This helper is now passed the full library for consistency.
function deserialize(data, library) {
    const { vars, classes, constraints } = library;
    if (data === undefined) {
        return data
    }
    if (Array.isArray(data)) {
        return data.map(el => deserialize(el, library));
    }
    if (typeof data === 'object' && data !== null) {
        if (data['$var']) return vars[data['$var']];
        if (data['$class']) {
            const Cls = classes[data['$class']];
            if (!Cls) throw new Error(`Unknown class: ${data['$class']}`);
            return new Cls(...deserialize(data.args || [], library));
        }
        if (data['$optional']) {
            return Value.optional(...deserialize(data['$optional'], library));
        }
        if (data['$required']) {
            return Value.required(...deserialize(data['$required'], library));
        }

        if (data['$constraint']) {
            if (!constraints[data['$constraint']]) throw new Error(`Unknown constraint: ${data['$constraint']}`);
            // We need to create a new instance of the constraint object
            // and deserialize its properties to handle nested variables correctly.
            const constraintTemplate = constraints[data['$constraint']];
            const newConstraint = { ...constraintTemplate };
            for (const key in newConstraint) {
                if (Object.hasOwn(newConstraint, key)) {
                    newConstraint[key] = deserialize(newConstraint[key], library);
                }
            }
            return newConstraint;
        }

        const newObj = {};
        for (const key in data) newObj[key] = deserialize(data[key], library);
        return newObj;
    }
    return data;
}

/**
 * Creates a configured test runner function.
 * @param {object} testLibraries - Contains the classes and constraints for a test suite.
 * @returns {function} A function that takes a single testCase and returns a serializable result.
 */
export function run({ vars, classes, constraints, term1, term2, bindings, location }) {
    const library = { vars, classes, constraints };

    // Deserialize the bindings object, converting its string keys to symbols.
    const liveBindings = {};
    if (bindings) {
        for (const key in bindings) {
            liveBindings[vars[key]] = deserialize(bindings[key], library);
        }
    }

    const liveTerm1 = deserialize(term1, library)
    const liveTerm2 = deserialize(term2, library)
    const liveLocation = deserialize(location, library)

    const result = unify(
        liveTerm1,
        liveTerm2,
        liveBindings,
        liveLocation,
    );

    return serialize(result, library);
}

export default function ({ term1, term2, bindings, location }) {
    return run({
        vars: createVars(),
        classes: {
            Point: class Point {
                constructor(x, y) { this.x = x; this.y = y; }
            },
            Vector: class Vector {
                constructor(x, y) { this.x = x; this.y = y; }
            },
            ArrayPattern,
            ObjectPattern,
        },
        constraints: {
            isPositive: {
                description: "must be a positive number",
                [unifyTag]: function (unify, otherBinding, bindings, location, selfBinding) {
                    const value = otherBinding.value
                    if (typeof value === 'number' && value > 0) {
                        return bindings;
                    }
                    return null;
                }
            },
            // A simple pattern that destructures an array into H
            deconstructsArray: {
                H: { '$var': 'H' },
                [unifyTag]: function (unify, otherBinding, bindings, location, selfBinding) {
                    const value = otherBinding.value
                    if (!Array.isArray(value) || value.length === 0) return null;
                    return unify(this.H, value[0], bindings, location);
                }
            },
        },
        term1,
        term2,
        bindings,
        location,
    })
}

