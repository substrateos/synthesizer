import { nameTag, reprTag } from '@/lib/logic/tags';
import repr from '@/lib/logic/repr';

/**
 * Converts a standardized trace event object into a human-readable, Prolog-style string.
 */
function traceEntryRepr(repr) {
    const event = this
    const indentation = '  '.repeat(event.depth || 0);
    const port = event.type.padEnd(4);
    const traceId = `(${event.id}) `;
    const goalStr = `${event.predicate}(${event.args.map(arg => repr(arg)).join(', ')})`;
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
            [reprTag]: traceEntryRepr,
        };

        let bindings;
        if (event.type === 'EXIT') {
            bindings = event.payload; // Use current solution for EXIT
        } else if (event.type === 'REDO' || (event.type === 'FAIL' && event.depth > 0)) {
            // Use last successful exit for REDO and non-top-level FAIL
            bindings = event.lastExit;
        }
        trace.push(repr(event, bindings));
        
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
