export default class {
    #workspace
    #prototypes;
    #data;
    #tracers;

    constructor({data} = {}) {
        this.#prototypes = new Map()
        this.#data = data || {}
        this.#tracers = []
        this.#regenTracers()
    }

    async init(workspace) {
        this.#workspace = workspace
        const namedTracerUnits = this.#workspace.query(({filter: ({unit}) => unit.tracer}))
        const preexistingInstances = new Set(Object.keys(this.#data))
        const nextPrototypes = new Map()
        for (const {name, unit} of namedTracerUnits) {
            const tracer = await this.#workspace.getAttribute({name, unit})
            nextPrototypes.set(name, tracer)
        }
        for (const name of preexistingInstances) {
            delete this.#data[name]
        }
        this.#prototypes = nextPrototypes
        this.#regenTracers()

        this.onInit(workspace)
    }

    #regenTracers() {
        const keys = [...this.#prototypes.keys()]
        keys.sort()
        this.#tracers = keys.map(name => {
            if (!(name in this.#data)) {
                this.#data[name] = {}
            }
            const tracer = this.#prototypes.get(name)
            const data = this.#data[name]
            Object.setPrototypeOf(data, tracer)
            return data
        })
    }

    #adjustTracersDueToWrite(set, del) {
        let regen = false
        if (set) {
            for (const name in set) {
                const unit = set[name]
                if (unit.tracer) {
                    const tracer = unit.evaluation
                    this.#prototypes.set(name, tracer)
                    regen = true
                }
            }
        }
        if (del) {
            for (const name of del) {
                if (this.#prototypes.delete(name)) {
                    delete this.#data[name]
                    regen = true
                }
            }
        }
        if (regen) {
            this.#regenTracers()
        }
    }

    onInit() {
        this.#tracers.forEach(t => t?.onInit(this.#workspace))
    }

    onLog(...msgs) {
        this.#tracers.forEach(t => t?.onLog(this.#workspace, msgs))
    }

    // these tracers get notified
    onPending(p) {
        return this.#tracers.forEach(t => t?.pending(this.#workspace, p))
    }

    // these tracers get inputs and can modify outputs
    onDo(inputs) {
        const callbacks = this.#tracers.map(t => t?.do(this.#workspace, inputs))
        return (result) => {
            for (const cb of callbacks) {
                const cbResult = cb && cb(result)
                if (cbResult !== undefined) {
                    result = cbResult
                }
            }
            return result
        }
    }

    onRestore(checkpoint) {
        const callbacks = this.#tracers.map(t => t?.onRestore(this.#workspace, checkpoint))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onCall() {
        const callbacks = this.#tracers.map(t => t?.onCall(this))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onEval() {
        const callbacks = this.#tracers.map(t => t?.onEval(this))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onSave() {
        const callbacks = this.#tracers.map(t => t?.onSave(this))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onClone() {
        const callbacks = this.#tracers.map(t => t?.onClone(this))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onSpawn() {
        const callbacks = this.#tracers.map(t => t?.onSpawn(this))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onWrite(options) {
        this.#adjustTracersDueToWrite(options.set, options.del)
        const callbacks = this.#tracers.map(t => t?.onWrite(this.#workspace, options))
        return (names) => callbacks.forEach(cb => cb && cb(names))
    }

    onRead(name) {
        const callbacks = this.#tracers.map(t => t?.onRead(this.#workspace, name))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }

    onGetAttribute(options) {
        const callbacks = this.#tracers.map(t => t?.onGetAttribute(this.#workspace, options))
        return (result) => callbacks.forEach(cb => cb && cb(result))
    }


    getTracerData(name) {
        // will lose its prototype relationship, which is what we want.
        return structuredClone(this.#data[name])
    }

    save() {
        // what do we do about prototypes?
        return {
            data: structuredClone(this.#data),
        }
    }

    restore(checkpoint) {
        this.#data = structuredClone(checkpoint.data)
    }

    clone() {
        return new this.constructor({
            data: structuredClone(this.#data),
            prototypes: this.#prototypes, // should be stateless. is this right?
        })
    }
}
