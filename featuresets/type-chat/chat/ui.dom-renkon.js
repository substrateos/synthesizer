import { html } from "@/lib/dom-renkon/preact@10.27.2/html.js"
import workspace from "@workspace"

import messages from "@/chat/messages.js"
import Transcript from "@/chat/ui/Transcript.dom-renkon.js"

const MessageInput = ({onChange}) => {
    return html `<input type="text" onChange=${e => { onChange(e); e.target.value = '' }} />`
}

const root = html `
<${Transcript} messages=${messages} />
<${MessageInput} onChange=${e => workspace.eval({type: 'chat/message/user', source: e.target.value})} />
`

export default root
