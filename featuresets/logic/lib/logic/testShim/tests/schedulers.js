export const attributes = {
    "type": "example/json"
};

export default [{
    "description": "Path-finding Logic Tests (DFS vs BFS)",
    "params": [{
        "source": `
// A graph with multiple levels
function edge(n1='a', n2='b') {} // a -> b (level 1)
function edge(n1='a', n2='d') {} // a -> d (level 1)
function edge(n1='b', n2='c') {} // b -> c (level 2)
function edge(n1='d', n2='e') {} // d -> e (level 2)

// Recursive step: A path exists if there is an edge to an
// intermediate node Y, and a path from Y to the destination.
// (Defined FIRST to force DFS to go deep)
function path(X, Z) {
    var Y;
    edge(X, Y);
    path(Y, Z);
}

// Base case: A path exists if there is a direct edge.
// (Defined SECOND)
function path(X, Y) {
    edge(X, Y);
}
        `,
        "queries": {
            "Should find all possible next steps in a path (DFS)": { "path": ["a", { "$var": "Z" }] },
            "Should find all possible next steps in a path (BFS)": { "path": ["a", { "$var": "Z" }] }
        },
        "configs": {
            "Should find all possible next steps in a path (BFS)": { "scheduler": "BFS" }
        }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
        "solutions": {
            "Should find all possible next steps in a path (DFS)": [
                { "Z": "c" },
                { "Z": "e" },
                { "Z": "b" },
                { "Z": "d" }
            ],
            "Should find all possible next steps in a path (BFS)": [
                { "Z": "b" },
                { "Z": "d" },
                { "Z": "c" },
                { "Z": "e" }
            ]
        }
    }
}]