import { generatedSourceTag } from "@/lib/logic/tags.js";
import ArrayPattern from "@/lib/logic/unify/ArrayPattern.js";
import ObjectPattern from "@/lib/logic/unify/ObjectPattern.js";

import logic from "@/lib/logic/logic.js"

// Used within tests...
const _ = Promise.all([
    import("@/lib/logic/testShim/files/simple.logic.js"),
    import("@/lib/logic/testShim/files/math.js"),
])

const {
    findall,
    solve,
    solveAsync,
    vars: createVars,
    tracer: createTracer,
    schedulers,
} = logic

/**
 * Recursively converts live JavaScript types into a JSON-compatible format.
 * This is the crucial step that prevents Symbols from being dropped.
 * @param {*} data - The live data (with Symbols, etc.).
 * @returns {*} The serialized, JSON-compatible data.
 */
function serialize(data) {
    if (data === null) return null;
    if (typeof data === 'symbol') {
        return { '$var': data.description };
    }
    if (typeof data !== 'object') {
        return data;
    }
    if (Array.isArray(data)) {
        return data.map(serialize);
    }
    if (data instanceof ArrayPattern) {
        return { '$class': 'ArrayPattern', 'args': data.parts.map(serialize) };
    }
    if (data instanceof ObjectPattern) {
        return { '$class': 'ObjectPattern', 'args': data.parts.map(serialize) };
    }
    const newObj = {};
    for (const key of Reflect.ownKeys(data)) {
        const newKey = typeof key === 'symbol' ? key.description : key;
        newObj[newKey] = serialize(data[key]);
    }
    return newObj;
}

/**
 * Deserializes a JSON-based query goal into a live goal with Symbols.
 */
function deserialize(data, vars) {
    if (Array.isArray(data)) {
        return data.map(el => deserialize(el, vars));
    }
    if (typeof data === 'object' && data !== null) {
        if (data['$var']) {
            return vars[data['$var']];
        }
        const newObj = {};
        for (const key in data) newObj[key] = deserialize(data[key], vars);
        return newObj;
    }
    return data;
}

export default async function({async, source, queries, configs}) {
    const db = async ? solveAsync`${source}` : solve`${source}`;
    
    const allSolutions = {};
    const allTraces = {};

    for (const queryName in queries) {
        const goalObject = queries[queryName];
        const predName = Object.keys(goalObject)[0];
        const jsonArgs = goalObject[predName];

        const vars = createVars();
        const liveArgs = deserialize(jsonArgs, vars);

        let predicateFn = db[predName];
        if (!predicateFn) {
            debugger
            allSolutions[queryName] = [{ error: `Predicate not found: ${predName}; have: ${Object.keys(db).join(', ')}` }];
            continue;
        }

        // Check for a custom configuration for this specific query.
        const queryConfig = configs?.[queryName];
        const configToApply = {};

        // Configure the scheduler if specified.
        if (queryConfig?.scheduler) {
            const schedulerClass = schedulers[queryConfig.scheduler];
            if (schedulerClass) {
                configToApply.defaultSchedulerClass = schedulerClass;
                configToApply.schedulerClass = schedulerClass;
            } else {
                allSolutions[queryName] = [{ error: `Scheduler not found: ${queryConfig.scheduler}` }];
                continue;
            }
        }

        // Always configure a tracer to capture the trace.
        const trace = [];
        allTraces[queryName] = trace;
        configToApply.tracer = createTracer(trace, {maxLength: 1000});

        // Get the final, configured query function.
        const configuredQuery = predicateFn.configure(configToApply);
        const solutionGenerator = configuredQuery(...liveArgs)
        allSolutions[queryName] = async ? await findall(solutionGenerator) : findall(solutionGenerator);
    }

    return serialize({
        solutions: allSolutions,
        generatedSource: db[generatedSourceTag],
        traces: allTraces
    });
}