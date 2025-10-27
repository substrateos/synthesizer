import { nameTag } from '@/lib/logic/tags';

/**
 * Converts a standardized trace event object into a human-readable, Prolog-style string.
 * This version includes a circular reference check to prevent infinite loops.
 */
function formatTraceEntry(event) {
    const visited = new Set();

    const argToString = (arg) => {
        // --- Handle Symbols (Variables) ---
        if (typeof arg === 'symbol') {
            const varName = arg.description;
            let bindings; // Variable to hold the correct bindings object
            if (event.type === 'EXIT') {
                bindings = event.payload; // Use current solution for EXIT
            } else if (event.type === 'REDO' || (event.type === 'FAIL' && event.depth > 0)) {
                // Use last successful exit for REDO and non-top-level FAIL
                bindings = event.lastExit;
            }
            // CALL and top-level FAIL will leave bindings undefined here

            // If bindings are available and the variable is bound...
            if (bindings && Object.hasOwn(bindings, arg)) {
                const boundValue = bindings[arg].value;
                if (visited.has(boundValue)) {
                    return `${varName} = [Circular]`;
                }
                // Format as "Var = Value" for EXIT, REDO, FAIL
                return `${varName} = ${argToString(boundValue)}`; // Apply consistent format
            }
            // Otherwise (CALL, top-level FAIL, or unbound var), show just the name
            return varName;
        }

        // --- (Rest of the function remains the same: Primitives, Objects, Arrays, Circularity) ---
        if (typeof arg === 'string') return `'${arg}'`;
        if (typeof arg !== 'object' || arg === null) return String(arg);
        if (visited.has(arg)) return '[Circular]';
        visited.add(arg);
        let result;
        if (Array.isArray(arg)) {
            result = `[${arg.map(argToString).join(', ')}]`;
        } else {
             if (arg.constructor !== Object && typeof arg.toString === 'function' && arg.toString !== Object.prototype.toString) {
                 result = arg.toString();
            } else {
                const body = Object.entries(arg).map(([k,v]) => `${k}: ${argToString(v)}`).join(', ');
                result = `{${body}}`;
            }
        }
        return result;
    };

    const indentation = '  '.repeat(event.depth || 0);
    const port = event.type.padEnd(4);
    const traceId = `(${event.id}) `;
    const goalStr = `${event.predicate}(${event.args.map(arg => argToString(arg)).join(', ')})`;

    return `${indentation}${port}: ${traceId}${goalStr}`;
}

/**
 * Creates a stateful tracer that builds a rich, human-readable trace of the solve process
 * based on the new four-port (CALL, REDO, EXIT, FAIL) protocol.
 */
export default function createTracer(trace, {maxLength}={}) {
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
        if (maxLength) {
            if (trace.length > maxLength) {
                throw new Error(`Trace has grown to > ${maxLength} entries. Assuming infinite loop.`);
            }
        }
    };
}
