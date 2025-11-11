export default class DFS {
    constructor() {
        this.tasks = [];
    }

    /**
     * Adds a task to the active queue for immediate processing.
     * @param {object} task The step object to add.
     */
    add(task) {
        this.tasks.push(task);
    }

    addAll(tasks) {
        for (let i = tasks.length - 1; i >= 0; i--) {
            this.add(tasks[i]);
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

    /**
     * Returns the next task from the active queue.
     * @returns {object | null} The next task or null if the queue is empty.
     */
    next() {
        return this.tasks.pop();
    }

    size() {
        return this.tasks.length
    }

    clear() {
        this.tasks = []
    }
}
