/**
 * A simple, foundational utility for building indented code strings.
 * This class manages an output buffer and the current indentation level.
 */
export default class Emitter {
    static from(expr) {
        const e = new Emitter()
        e.emit(expr)
        return e
    }
    #lines;
    #indentInitial;
    #indentation;
    #indentStr;
    #prefix;

    constructor(indentStr = '    ', indentation = 0, indentInitial = true) {
        this.#lines = [];
        this.#indentInitial = indentInitial;
        this.#indentation = indentation;
        this.#indentStr = indentStr;
        this.#prefix = this.#indentStr.repeat(this.#indentation);
    }

    #emitLine(line) {
        const initial = this.#lines.length === 0
        const prefix = (this.#indentInitial || !initial)
            ? this.#prefix
            : ''
        this.#lines.push(prefix + line);
    }

    /** Emits one or more lines, respecting indentation. */
    emit(...lines) {
        for (const line of lines) {
            if (typeof line === 'function') {
                line(this)
            } else if (line instanceof Emitter) {
                for (const l of line.#lines) {
                    this.#emitLine(l)
                }
            } else if (Array.isArray(line)) {
                for (const l of line) {
                    this.emit(l)
                }
            } else {
                for (const singleLine of line.split('\n')) {
                    this.#emitLine(singleLine)
                }
            }
        }
    }

    child(fn, indentInitial=true) {
        const e = new Emitter(this.#indentStr, 1, indentInitial)
        e.emit(fn)
        if (e.#lines.length === 0) {
            throw new Error('child did not emit any lines')
        }
        return e
    }

    children(exprs) {
        const e = new Emitter(this.#indentStr, 1)
        for (const expr of exprs) {
            e.emit(expr)
        }
        return e
    }

    continue() {
        this.emit('continue;');
    }

    break() {
        this.emit('break;');
    }

    fallthrough() {
    }

    toString() {
        return this.#lines.join('\n');
    }
}
