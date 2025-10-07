import chatMessagesInit from "@/chat/messages/init"

import createChatCompletion from "@/services/aiChat/operations/createChatCompletion"

const origConsoleLog = console.log

const assistantCompletionMessageSymbol = Symbol("assistantCompletionMessage")

export default async function() {
    const {unit: {source}, workspace} = this
    const textMessage = (role, text) => ({role, content: [{type: 'text', text}]})
    const {role, content} = JSON.parse(source)

    let messages
    if (workspace.has('chat/messages')) {
        messages = await workspace.get('chat/messages')
    } else {
        messages = await chatMessagesInit()
    }

    messages = Object.freeze([...messages, {role, content}])
    await workspace.write({'chat/messages': {source: JSON.stringify(messages), type: 'json'}})

    const assistantCompletion = await createChatCompletion({messages: messages})

    // todo would be good to branch somehow and explore all choices, not just the first ones
    const assistantCompletionMessage = assistantCompletion.choices[0].message

    let {
        trimmedAssistantMessage,
        task,
        renderResult,
    } = await workspace.eval({type: 'message/assistant', source: assistantCompletionMessage.content})

    let assistantMessage = textMessage(assistantCompletionMessage.role, trimmedAssistantMessage)
    assistantMessage[assistantCompletionMessageSymbol] = assistantCompletionMessage
    messages = Object.freeze([...messages, assistantMessage])
    await workspace.write({'chat/messages': {source: JSON.stringify(messages), type: 'json'}})

    if (task) {
        origConsoleLog('start', {task})
        if (task.ok) {
            task = await workspace.eval({type: 'task', source: JSON.stringify(task)})
            origConsoleLog('done', {task})
        }

        if (!task.ok) {
            task = await workspace.eval({type: 'task/error', source: JSON.stringify(task)})
            origConsoleLog('error done', {task})
        }

        const systemMessageText = renderResult(task).join("\n")
        const systemMessage = JSON.stringify(textMessage("system", systemMessageText))
        assistantMessage = await workspace.eval({type: 'message', source: systemMessage})
    }

    return assistantMessage
}
