export default {
    empty: Object.freeze([]),
    of(event) { return [event] },
    concat(a, b) { return [...a, ...b] },
    *iterator(trace) { yield* trace },
}
