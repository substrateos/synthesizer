import initialInstructions from "@/chat/messages/init/instructions.js"
import initialDemos from "@/chat/messages/init/demos.js"
import runMessageAssistant from "@/do/get/chat/message/assistant/evaluation.js"
import listGlobals from "@/globals/listGlobals"

export default async function() {
    let globalsDocs = await Promise.all(listGlobals().map(g => workspace.getAttribute({name: g, attribute: 'docs'})))
    globalsDocs = globalsDocs.filter(_ => _)

    const textMessage = (role, text) => ({role, content: [{type: 'text', text: Array.isArray(text) ? text.join("\n"): text}]})
    return [
        textMessage("system", [
            ...initialInstructions,
            `The javascript environment has the following globals:\n\n\`\`\`javascript\n${globalsDocs.join("\n\n")}\n\`\`\`\n`,
        ]),
        ...initialDemos.flatMap(({taskDepth=3, taskName, userText, assistantTaskPrompt, workspaceTaskReply, assistantTaskReply}) => [
            textMessage("user", userText),
            textMessage("assistant", [
                ...runMessageAssistant.renderPrompt({taskDepth: taskDepth, name: taskName, ...assistantTaskPrompt}),
            ]),
            textMessage("system", [
                ...runMessageAssistant.renderResult({depth: taskDepth, sections: workspaceTaskReply}),
            ]),
            textMessage("assistant", assistantTaskReply),
        ]),
    ]
}
