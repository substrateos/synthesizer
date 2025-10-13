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
