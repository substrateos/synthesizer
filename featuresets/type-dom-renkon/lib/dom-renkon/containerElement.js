export default class extends HTMLElement {
    connectedCallback() {
        const ps = this.programState
        const workspace = this.workspace
        const importReceivers = this.importReceivers
        const refreshReceiversNamed = this.refreshReceiversNamed

        const onWrite = ({detail: {set, del}}) => {
            const names = []
            for (const name in set) {
                const receivers = importReceivers.has(name)
                if (!receivers) { continue }
                names.push(name)
            }
            if (del) {
                for (const name of del) {
                    const receivers = importReceivers.has(name)
                    if (!receivers) { continue }
                    names.push(name)
                }
            }
            if (names.length) {
                refreshReceiversNamed(names)
            }
        }
        workspace.addEventListener('write', onWrite)

        const onRestore = () => {
            refreshReceiversNamed([...importReceivers.keys()])
        }
        workspace.addEventListener('restore', onRestore)

        // provide our initial update
        refreshReceiversNamed([...importReceivers.keys()])

        // and then start running
        if (!ps.evaluatorRunning) {
            ps.evaluator(Date.now());
        }

        this.dispose = () => {
            if (ps?.evaluatorRunning) {
                window.cancelAnimationFrame(ps.evaluatorRunning)
                ps.evaluatorRunning = 0
            }
            this.dispose = undefined

            workspace.removeEventListener('write', onWrite)
            workspace.removeEventListener('restore', onRestore)
        }
    }
    disconnectedCallback() {
        this.dispose && this.dispose()
    }
}
