export const attributes = {
    type: "example/json"
};

export default [{
    description: "Path-finding Logic Tests",
    params: [{
        source: `
function edge(n1='a', n2='b') {}
function edge(n1='a', n2='c') {}
function edge(n1='b', n2='d') {}
function edge(n1='c', n2='d') {}

// Base case: A path exists if there is a direct edge.
function path(X, Y) {
    edge(X, Y);
}

// Recursive step: A path exists if there is an edge to an
// intermediate node Y, and a path from Y to the destination.
function path(X, Z) {
    var Y;
    edge(X, Y);
    path(Y, Z);
}
        `,
        queries: {
            "Should find all possible next steps in a path": { path: ['a', { "$var": "Z" }] },
            "Should succeed twice for a path that has two routes": { path: ['a', 'd'] },
            "Should fail to find a path that does not exist": { path: ['d', 'a'] }
        },
    }],
    debugKeys: ["generatedSource", "predicates", "traces"],
    returns: {
        "solutions": {
            "Should find all possible next steps in a path": [
                { "Z": "b" },
                { "Z": "c" },
                { "Z": "d" },
                { "Z": "d" }
            ],
            "Should succeed twice for a path that has two routes": [
                {},
                {}
            ],
            "Should fail to find a path that does not exist": []
        },
    }
}]