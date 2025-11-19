import newContext from "@/lib/vscode/commands/newContext.js";

const commandRegistry = {
    'synth.newContext': newContext,
};

export default {
    /**
     * Executes a command.
     * @param {Function} resolve A function (uri) -> { synth, path, authority }
     * @param {object} message The full message payload.
     */
    async doCommand(resolve, message) {
        const {commandId, commandArgs} = message
        const handler = commandRegistry[commandId];

        if (!handler) {
            console.error(`CommandsAdapter: Received unknown command type '${commandId}'`, message);
            throw new Error(`Unknown command type: '${commandId}'`);
        }

        try {
            // Pass the resolver as the first argument
            const result = await handler(resolve, ...commandArgs);
            return result || {}; 
        } catch (e) {
            console.error(`Error executing command '${commandId}':`, e);
            throw e; 
        }
    }
}
