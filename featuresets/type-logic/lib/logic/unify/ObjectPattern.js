import { unifyTag, groundTag } from "@/lib/logic/tags";

export default class ObjectPattern {
    constructor(properties) {
        this.properties = properties;
    }

    [unifyTag](unify, value, bindings, location) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return null;
        }

        let currentBindings = bindings;
        for (const key in this.properties) {
            if (!Object.hasOwn(value, key)) {
                return null;
            }
            currentBindings = unify(this.properties[key], value[key], currentBindings, location);
            if (currentBindings === null) {
                return null;
            }
        }
        return currentBindings;
    }

    [groundTag](ground, bindings) {
        const newObj = {};
        for (const key in this.properties) {
            newObj[key] = ground(this.properties[key], bindings);
        }
        return newObj;
    }
}
