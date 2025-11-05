import { reprTag } from "@/lib/logic/tags.js";

export default function repr(arg, bindings=null, visited=new Set(), reprRec) {
    switch (typeof arg) {
        case 'undefined':
            return "undefined"
        case 'object':
            if (arg != null) {
                break
            }
        case 'bigint':
        case 'boolean':
        case 'number':
        case 'string':
            return JSON.stringify(arg)
    }

    if (!reprRec) {
        reprRec = o => repr(o, bindings, visited, reprRec)
    }

    if (typeof arg === 'symbol') {
        if (bindings && Object.hasOwn(bindings, arg)) {
            const boundValue = bindings[arg].value;
            // Format as "Var = Value"
            return `${arg.description} = ${reprRec(boundValue)}`;
        }
        return `${arg.description}`;
    }
    
    if (visited.has(arg)) return '<Circular>';
    visited.add(arg);

    if (Array.isArray(arg)) {
        return `[${arg.map(reprRec).join(', ')}]`;
    }
    if (reprTag in arg) {
        return arg[reprTag](reprRec);
    } 
    if (arg.constructor !== Object && typeof arg.toString === 'function' && arg.toString !== Object.prototype.toString) {
        return arg.toString();
    } 
    const body = Object.entries(arg).map(([k,v]) => `${k}: ${reprRec(v, bindings, visited)}`).join(', ');
    return `{${body}}`;
};
