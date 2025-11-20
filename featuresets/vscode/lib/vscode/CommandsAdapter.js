import newContext from "@/lib/vscode/commands/newContext.js";

const commandRegistry = {
    'synth.newContext': newContext,
};

export default {
    /**
     * Executes a command.
     * @param {pbject} context A context object with {resolve: (uri) => { synth, path, authority }, previewAdapter} 
     * @param {object} message The full message payload.
     */
    async doCommand(context, message) {
        const {commandId, commandArgs} = message
        const handler = commandRegistry[commandId];

        if (!handler) {
            console.error(`CommandsAdapter: Received unknown command type '${commandId}'`, message);
            throw new Error(`Unknown command type: '${commandId}'`);
        }

        try {
            // Pass the resolver as the first argument
            const result = await handler(context, ...commandArgs);
            return result || {}; 
        } catch (e) {
            console.error(`Error executing command '${commandId}':`, e);
            throw e; 
        }
    }
}
