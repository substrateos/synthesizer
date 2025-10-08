import { render } from "@workspace/lib/htm@3.1.1/preact.js"

import probeMany from "@workspace/lib/html/probe-many"
import probeHandler from "@workspace/lib/html/probe-handler"

export default async function ({unit}) {
    const e = document.createElement('div')
    render(unit, e)

    const result = await probeMany({
        "startNode": e,
        "handler": probeHandler,
        "probes": {
            "userMessage": [{"select": ".chat-message.chat-user"}, {"get": "innerText"}],
            "assistantMessage": [{"select": ".chat-message.chat-assistant"}, {"get": "innerText"}],
        },
    })
    console.log({result})
}
