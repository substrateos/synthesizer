import { ulid } from '@workspace/lib/ulid.js'

export default class extends EventTarget {
    #units;

    constructor({units}= {}) {
        super()
        this.#units = {...units}
    }

    #generateName() {
        return `unit-${ulid()}`
    }

    save() {
        return Object.freeze({...this.#units}) // everything in here should already be frozen or uncloneable
    }

    restore(units) {
        this.#units = {...units}
        const event = new CustomEvent('restore')
        this.dispatchEvent(event)
        return this
    }

    clone() {
        return new this.constructor({
            units: {...this.#units},
        })
    }

    async write(units) {
        const set = {}
        let deleted
        const names = []
        const entries = Array.isArray(units) ? units.entries() : Object.entries(units)
        for (let [key, unit] of entries) {
            if (unit === undefined) {
                if (!deleted) {
                    deleted = []
                }
                if (typeof key === 'string') {
                    deleted.push(key)
                }
                names.push(undefined)
                continue
            }

            // hack clone as much of the unit as we can. if there are evaluation fields, they be functions and thus not cloneable.
            let {evaluation, ...attributes} = unit
            unit = structuredClone(attributes)
            if (evaluation !== undefined) {
                unit.evaluation = evaluation
            }

            const name = typeof key === 'number' ? this.#generateName() : key
            names.push(name)
            set[name] = Object.freeze(unit)
        }
        Object.freeze(set)

        if (deleted) {
            Object.freeze(deleted)
        }

        Object.assign(this.#units, set)
        if (deleted) {
            for (const name of deleted) {
                delete this.#units[name]
            }
        }

        Object.freeze(names)
        Object.freeze(set)

        const wrote = {names, set, deleted}
        const event = new CustomEvent('write', {detail: wrote})
        this.dispatchEvent(event)
        return wrote
    }

    read(name) {
        const source = this.#units[name]
        if (!source) {
            throw new Error(`unknown name: ${name}`)
        }
        return source
    }

    names() {
        return Object.keys(this.#units)
    }

    query({filter}={}) {
        const unitEntries = Object.entries(this.#units)
        let units = unitEntries.map(([name, unit]) => ({name, unit}))
        if (filter) {
            units = units.filter(o => filter(o))
        }
        return units
    }

    has(name) {
        return name in this.#units
    }
}
