const {html} = Renkon.app

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
        <div class="chat-message chat-${msg.sender}" style="${styles.message} ${msg.sender === 'user' ? styles.user : styles.assistant}">
          ${msg.text}
        </div>
      `)}
    </div>
  `;
}

const time = Behaviors.timer(1000)

const root = ChatUI({
    messages: [
        {sender: 'user', text: `hi at ${time}`},
        {sender: 'assistant', text: 'hi to you too'},
    ]
})

export default root
