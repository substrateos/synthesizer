import Store from "@/lib/synth/Store.js"
import Tracer from "@/lib/synth/Tracer.js"
import doer from "@/lib/synth/doer.js"

/**
 * Creates a buffered async generator that yields events from an EventTarget
 * without dropping any.
 *
 * @param {EventTarget} target The EventTarget to listen on.
 * @param {object} subscriptions An object keyed by event name and whose values are listeners
 * @returns {AsyncGenerator<Event, void, void>} A lossless async generator.
 */
async function* eventsBuffered(target, subscriptions) {
  const eventQueue = [];
  const resolveQueue = [];

  const listenerBridge = (event) => {
    if (resolveQueue.length > 0) {
      const resolver = resolveQueue.shift(); // Get the oldest resolver
      resolver(event);
    } else {
      eventQueue.push(event);
    }
  };

  const cleanups = []
  for (const [eventName, fn] of Object.entries(subscriptions)) {
    const listener = (event) => {
        const value = fn(event)
        if (value !== undefined) {
            listenerBridge(value)
        }
    }
    target.addEventListener(eventName, listener);
    cleanups.push(() => target.removeEventListener(eventName, listener));
  }

  try {
    while (true) {
      // If there's an event in the queue, yield it right away.
      if (eventQueue.length > 0) {
        yield eventQueue.shift(); // Yield the oldest event
      } else {
        // Otherwise, wait for the next event to arrive.
        yield await new Promise(resolve => {
          resolveQueue.push(resolve);
        });
      }
    }
  } finally {
    cleanups.forEach(f => f())
  }
}

export default class {
    #zygote;
    #store;
    #tracer;
    #doer;

    constructor({units, store, zygote}={}) {
        this.#zygote = zygote
        this.#store = store || new Store({units})
        this.#doer = doer
        this.#tracer = new Tracer()

        this.do = new Proxy(
            async (action, ...args) => {
                let unit = args[0]?.unit
                let name = args[0]?.name
                if (!unit) {
                    if (name && this.has(name)) {
                        unit = this.read(name)
                    }
                }

                const doThis = {action, name, unit, workspace: this}
                const traceFinish = this.#tracer.onDo(...args)
                const p = (async () => {
                    let returned, caught
                    try {
                        returned = await doer.call(doThis, ...args)
                    } catch (err) {
                        caught = err
                    }
                    traceFinish({returned, caught})
                    if (caught) {
                        throw caught
                    }
                    return returned
                })()
                p.do = {this: doThis, args} // for debugging
                this.#tracer.onPending(p)
                return await p
            },
            {
                get: (target, action) => {
                    return (...args) => {
                        return target(action, ...args)
                    }
                },
            });

        this.log = (...msgs) => this.#tracer.onLog(...msgs)
    }

    addEventListener(name, listener, options) {
        this.#store.addEventListener(name, listener, options)
    }

    removeEventListener(name, listener) {
        this.#store.removeEventListener(name, listener)
    }

    async getAttribute(options) {
        const traceFinish = this.#tracer.onGetAttribute(options)
        let {unit, attribute='evaluation', name, ...rest} = options
        if (!unit) {
            if (this.has(name)) {
                unit = this.read(name)
            }
        }

        if (!attribute) {
            traceFinish(unit)
            return unit
        }

        let value = unit?.[attribute]

        if (value === undefined) {
            value = await this.do('get', {unit, name, attribute, ...rest})
        }

        traceFinish(value)
        return value
    }

    // this is not the general solution. it will only yield values when the underlying unit changes, not any of its dependencies changes.
    async *generatorForAttribute({attribute, name, ...rest}) {
        yield await await this.getAttribute({name, attribute, ...rest})
        yield *eventsBuffered(this.#store, {
            'write': ({detail: {set, deleted}}) => {
                if (name in set || deleted?.includes(name)) {
                    return this.getAttribute({name, attribute, ...rest})
                }
            },
            'restore': () => {
                // not really accurate...
                return this.getAttribute({name, attribute, ...rest})
            },
        })
    }

    async get(name) {
        return await this.getAttribute({name})
    }

    *query(options) {
        yield *this.#store.query(options)
    }

    *walk({path=[], name}={}) {
        yield {path: [...path], name, unit: undefined, synth: this}
        yield *this.synths({recursive: true, path})
    }

    *synths({recursive, path=[]}={}) {
        for (const {name, unit} of this.#store.query({filter: ({unit, name}) => unit.synth})) {
            yield {path: [...path, name], name, unit, synth: unit.synth}
            if (recursive) {
                yield *unit.synth.synths({path: [...path, name], recursive})
            }
        }
    }

    names() {
        return this.#store.names()
    }

    has(name) {
        return this.#store.has(name)
    }

    read(name) {
        const traceFinish = this.#tracer.onRead(name)
        const result = this.#store.read(name)
        traceFinish(result)
        return result
    }
    
    async write(units) {
        const traceFinish = this.#tracer.onWrite(units)
        const writeResult = await this.#store.write(units)
        const names = writeResult.names
        traceFinish(writeResult)
        return names
    }

    async eval(unit) {
        const traceFinish = this.#tracer.onEval(unit)

        const [name] = await this.write([unit])

        let result, caught
        try {
            result = await this.getAttribute({unit, name})
        } catch (err) {
            caught = err
        }
        traceFinish({result, caught})
        if (caught) {
            throw caught
        }
        return result
    }

    async call(unit) {
        const traceFinish = this.#tracer.onCall(unit)
        const clone = await this.clone()
        let result, caught
        try {
            result = await clone.eval(unit)
        } catch (err) {
            caught = err
        }
        traceFinish({result, caught})
        if (caught) {
            throw caught
        }
        return result
    }


    save() {
        const traceFinish = this.#tracer.onSave()
        const checkpoint = {
            zygote: this.#zygote?.save(),
            units: this.#store.save(),
            tracer: this.#tracer.save(),
            doer: this.#doer.save(),
        }
        traceFinish(checkpoint)
        return traceFinish
    }

    async restore(checkpoint) {
        const traceFinish = this.#tracer.onRestore(checkpoint)
        this.#zygote = new this.constructor()
        await this.#zygote.restore(checkpoint.zygote)
        this.#store = this.#store.restore(checkpoint.units)
        this.#doer = this.#doer.restore(checkpoint.doer)
        this.#tracer = this.#tracer.restore(checkpoint.tracer)
        await this.#tracer.init(this)
        traceFinish()
        return this
    }

    setZygote(zygote) {
        this.#zygote = zygote
        return this
    }

    async resetZygote() {
        this.setZygote(undefined)
        const zygote = await this.clone()
        this.setZygote(zygote)
        return this
    }
    
    async spawn() {
        const traceFinish = this.#tracer.onSpawn()
        const spawn = await this.#zygote.clone()
        // this may not be the most elegant way to do this. maybe the zygote itself should be set up as its own zygoet?
        spawn.setZygote(this.#zygote)
        traceFinish(spawn)
        return spawn
    }

    async clone() {
        const traceFinish = this.#tracer.onClone()
        const clone = new this.constructor({
            zygote: this.#zygote,
            store: this.#store.clone(),
            doer: this.#doer.clone(),
            tracer: this.#tracer.clone(),
        })
        await clone.#tracer.init(clone)
        traceFinish(clone)
        return clone
    }

    getTracerData(name) {
        return this.#tracer.getTracerData(name)
    }
}
