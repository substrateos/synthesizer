export default {
    base: import.meta.url,
    urls: [
        'do/get/chat/message/evaluation.js',
        'do/get/chat/message/assistant/evaluation.js',
        'do/get/chat/message/user/evaluation.js',
        'do/get/chat/plan/json/evaluation.js',
        'do/get/chat/plan/markdown/evaluation.js',
        'do/get/chat/prompt/evaluation.js',
        'do/get/chat/prompt/markdown/evaluation.js',
        'do/get/chat/task/evaluation.js',
        'do/get/chat/task/error/evaluation.js',

        'do/edit.js',

        'chat/messages/init.js',
        'chat/messages/init/demos.js',
        'chat/messages/init/instructions.js',
        'chat/ui/Transcript.js',
        'chat/ui.dom-renkon.js',
    ],
}
