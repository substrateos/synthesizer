import { reprTag } from "@/lib/logic/tags.js";

// Iterator flattens the tree on demand (Depth-First, Left-to-Right).
// Yields events in chronological order (Oldest -> Newest).
function* iterator(trace) {
    trace = trace ?? this;
    if (!trace) return;

    // Stack-based traversal to avoid recursion depth limits.
    // We traverse Left (Old) -> Right (New).
    // Stack is LIFO, so push Right then Left.
    const stack = [trace];

    while (stack.length > 0) {
        const node = stack.pop();

        if (node.type === 'BRANCH') {
            if (node.right) stack.push(node.right);
            if (node.left) stack.push(node.left);
        } else if (node.type === 'LEAF') {
            yield node.event;
        } else {
            throw new Error(`unknown trace node type: ${node.type}`)
        }
    }
}

function repr(reprRec) {
    const items = Array.from(this);
    return `[${items.map(reprRec).join(', ')}]`;
}

/**
 * An immutable, O(1) concatenation trace structure (Concat-Tree/Rope).
 * Allows merging variable histories without array copying performance penalties.
 */
const Trace = {
    empty: null,

    // Creates a Leaf Node.
    of(event) {
        return {
            type: 'LEAF',
            event,
            [Symbol.iterator]: iterator,
            [reprTag]: repr,
        };
    },

    // Creates a Branch Node. O(1).
    // It never copies data. It just links two existing trees.
    concat(left, right) {
        if (!left) return right;
        if (!right) return left;
        return {
            type: 'BRANCH',
            left,
            right,
            [Symbol.iterator]: iterator,
            [reprTag]: repr,
        };
    },
}

export default Trace