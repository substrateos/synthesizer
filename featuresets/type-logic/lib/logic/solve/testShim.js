import solve from '@/lib/logic/solve';
import { predicatesTag, nameTag, generatedSourceTag } from '@/lib/logic/tags';
import createVars from '@/lib/logic/vars';
import DFS from "@/lib/logic/schedulers/DFS";
import BFS from "@/lib/logic/schedulers/BFS";

const schedulers = { DFS, BFS };
/**
 * Creates a stateful tracer that builds a rich, human-readable trace of the solve process
 * based on the new four-port (CALL, REDO, EXIT, FAIL) protocol.
 */
function createTracer(trace) {
    // Store the last successful exit bindings for each goal ID.
    const lastExitBindings = new Map();

    return (goal, eventType, payload) => {
        // Store bindings on EXIT
        if (eventType === 'EXIT') {
            lastExitBindings.set(goal.id, payload);
        }

        // Assemble the rich event object for the formatter.
        const event = {
            id: goal.id,
            type: eventType,
            depth: goal.depth,
            predicate: goal.resolver[nameTag],
            args: goal.args,
            payload, // Used for EXIT
            lastExit: lastExitBindings.get(goal.id), // Used for REDO and FAIL
        };

        trace.push(formatTraceEntry(event));
        
        // Clean up map on final FAIL to save memory
        if (eventType === 'FAIL') {
            lastExitBindings.delete(goal.id);
        }

        // Safety brake to prevent infinite loops from crashing the test environment.
        if (trace.length > 1000) {
            throw new Error(`Trace has grown to > 1000 entries. Assuming infinite loop.`);
        }
    };
}
/**
 * Converts a standardized trace event object into a human-readable, Prolog-style string.
 * This version includes a circular reference check to prevent infinite loops.
 */
function formatTraceEntry(event) {
    // A Set to track objects and arrays we've already started to format
    // for this specific trace entry. This prevents infinite recursion.
    const visited = new Set();

    /**
     * Helper to recursively format arguments for printing.
     * If this is an EXIT event, it resolves variables against the solution.
     */
    const argToString = (arg) => {
        // --- Handle non-objects and primitives first ---
        if (typeof arg === 'symbol') {
            let bindings;
            // CALL uses no bindings (shows 'X')
            // EXIT uses the current solution payload.
            if (event.type === 'EXIT') bindings = event.payload;
            // REDO and FAIL use the *last known successful* bindings.
            else if (event.type === 'REDO') bindings = event.lastExit;
            // Hack: Sub-goal FAILs use last exit, top-level FAIL uses original args.
            else if (event.type === 'FAIL' && event.depth > 0) bindings = event.lastExit;

            // On EXIT, try to show the bound value.
            if (bindings && Object.hasOwn(bindings, arg)) {
                // The recursive call must also be to this helper.
                return argToString(bindings[arg].value);
            }
            // Otherwise, show the variable name.
            return arg.description;
        }
        if (typeof arg === 'string') return `'${arg}'`;
        if (typeof arg !== 'object' || arg === null) {
            return String(arg);
        }

        // --- Circular reference check for objects and arrays ---
        if (visited.has(arg)) {
            return '[Circular]';
        }
        visited.add(arg);

        // --- Recursive formatting for objects and arrays ---
        if (Array.isArray(arg)) {
            return `[${arg.map(argToString).join(', ')}]`;
        }

        const body = Object.entries(arg).map(([k,v]) => `${k}: ${argToString(v)}`).join(', ');
        return `{${body}}`;
    };

    const indentation = '  '.repeat(event.depth || 0);
    const port = event.type.padEnd(4);
    const traceId = `(${event.id}) `;
    const goalStr = `${event.predicate}(${event.args.map(argToString).join(', ')})`;

    return `${indentation}${port}: ${traceId}${goalStr}`;
}

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

export default function({source, queries, configs}) {
    const db = solve`${source}`;
    
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
        configToApply.tracer = createTracer(trace);

        // Get the final, configured query function.
        const configuredQuery = predicateFn.configure(configToApply);

        const solutionsForQuery = [];
        // Call the configured query function, which calls the solver internally.
        for (const solution of configuredQuery(...liveArgs)) {
            solutionsForQuery.push(solution);
        }
        allSolutions[queryName] = solutionsForQuery;
    }

    const predicates = {};
    for (const predName in db) {
        if (Object.hasOwn(db, predName)) {
            predicates[predName] = db[predName][predicatesTag];
        }
    }

    return serialize({
        solutions: allSolutions,
        generatedSource: db[generatedSourceTag],
        predicates: predicates,
        traces: allTraces
    });
}