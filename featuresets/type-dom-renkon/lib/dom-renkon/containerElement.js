export default class extends HTMLElement {
    connectedCallback() {
        const ps = this.programState
        const workspace = this.workspace
        const imports = this.imports
        const resampleImports = this.resampleImports

        const disposers = []

        const onWrite = ({detail: {set, del}}) => {
            const names = []
            for (const name in set) {
                if (imports.has(name)) {
                    names.push(name)
                }
            }
            if (del) {
                for (const name of del) {
                    if (imports.has(name)) {
                        names.push(name)
                    }
                }
            }
            if (names.length) {
                resampleImports(names)
            }
        }
        workspace.addEventListener('write', onWrite)
        disposers.push(() => workspace.removeEventListener('write', onWrite))

        const onRestore = () => { resampleImports() }
        workspace.addEventListener('restore', onRestore)
        disposers.push(() => workspace.removeEventListener('restore', onRestore))

        // provide our initial update
        resampleImports()

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

            for (const disposer of disposers) {
                disposers()
            }
        }
    }
    disconnectedCallback() {
        this.dispose && this.dispose()
    }
}
