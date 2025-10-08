const {html} = Renkon.app

import messages from "@/chat/messages"

function ChatUI({ messages = [] }) {
  const styles = {
    container: 'font-family: ui-sans-serif, system-ui, sans-serif; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; max-width: 600px; margin: 2rem auto; display: flex; flex-direction: column; gap: 0.75rem;',
    message: 'padding: 0.5rem 0.875rem; border-radius: 1.25rem; max-width: 80%; line-height: 1.5; word-wrap: break-word;',
    user: 'background-color: #007aff; color: white; align-self: flex-end;',
    assistant: 'background-color: #f0f0f0; color: black; align-self: flex-start;'
  };

  return html`
    <div style=${styles.container}>
      ${messages.map(msg => html`
        <div class="chat-message chat-${msg.role}" style="${styles.message} ${msg.role === 'user' ? styles.user : styles.assistant}">
          ${msg.content.flatMap(({text}) => text).join(" ")}
        </div>
      `)}
    </div>
  `;
}

const root = ChatUI({messages})

console.log('in renkon', {messages})

export default root
