export default class BFS {
    constructor() {
        this.tasks = []; // Single array queue
    }
    add(task) {
        this.tasks.push(task); // Enqueue at the end
    }
    addAll(tasks) {
        // Add in source order (since shift takes from front)
        for (const task of tasks) {
            this.add(task);
        }
    }
    resume(tasks) {
        this.tasks.push(...tasks)
    }
    pause(pred) {
        const keep = []
        const paused = []
        for (const task of this.tasks) {
            (pred(task) ? paused : keep).push(task)
        }
        this.tasks = keep
        return paused
    }
    next() {
        return this.tasks.shift(); // Dequeue from the front (FIFO)
    }
    size() { return this.tasks.length; }
    clear() { this.tasks = []; }
}