export default class BFS {
    constructor() {
        // inbox is for fast O(1) additions (enqueue).
        this.inbox = [];
        // outbox is for fast O(1) removals (dequeue).
        this.outbox = [];
    }

    /**
     * Adds a task to the queue in O(1) time.
     * @param {object} task The step object to add.
     */
    add(task) {
        this.inbox.push(task);
    }

    addAll(tasks) {
        for (const task of tasks) {
            this.add(task);
        }
    }

    /**
     * Returns the next task from the queue in amortized O(1) time.
     * @returns {object | undefined} The next task or undefined if the queue is empty.
     */
    next() {
        // If the outbox is empty, transfer items from the inbox.
        if (this.outbox.length === 0) {
            // If the inbox is also empty, there's nothing to do.
            if (this.inbox.length === 0) {
                return undefined;
            }
            // This is the O(n) operation, but it only runs occasionally.
            while (this.inbox.length > 0) {
                this.outbox.push(this.inbox.pop());
            }
        }

        // The outbox now contains the oldest items, ready for a fast pop.
        return this.outbox.pop();
    }

    size() {
        return this.inbox.length + this.outbox.length
    }

    clear() {
        this.inbox = []
        this.outputs = []
    }
}
