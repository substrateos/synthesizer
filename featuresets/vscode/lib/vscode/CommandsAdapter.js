import newContext from '@/lib/vscode/commands/newContext';

const commandRegistry = {
    'synth.newContext': newContext,
};

/**
* This adapter acts as a "command hub," routing command-related
* messages to their specific implementations.
*/
export default {
    /**
     * Executes a command against the synth store.
     * @param {Synth} synth The synth store.
     * @param {object} message The full message payload from the client.
     */
    async doCommand(synth, message) {
        const {commandId, commandArgs} = message
        const handler = commandRegistry[commandId];

        if (!handler) {
            console.error(`CommandsAdapter: Received unknown command type '${commandId}'`, message);
            throw new Error(`Unknown command type: '${commandId}'`);
        }

        // The handler is an async function that performs the work (e.g., synth.write)
        // It can return data, which will be sent back in the 'response' message.
        try {
            const result = await handler(synth, ...commandArgs);
            return result || {}; // Default to empty success object
        } catch (e) {
            console.error(`Error executing command '${commandId}':`, e);
            throw e; // Re-throw to be caught by #runRequest
        }
    }
}
