export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Compiler throws ReferenceError for undeclared variable Y",
        params: [
            {
                // "function test(X) { " is 19 chars long. Y starts at column 19.
                source: "function test(X) { Y = 10; }",
                queries: {} 
            }
        ],
        throws: {
            name: "Error",
            message: "ReferenceError: Identifier 'Y' is not defined. (line 1, column 19)"
        }
    },
    {
        description: "Compiler allows declared 'var' variables",
        params: [
            {
                source: `
                function test_ok(X) {
                    var Y;
                    Y = 10;
                    X = Y;
                }
                `,
                queries: {
                    "OK": { "test_ok": [{ "$var": "X" }] }
                }
            }
        ],
        debugKeys: ["generatedSource", "traces"],
        returns: {
            solutions: {
                "OK": [{ "X": 10 }]
            }
        }
    },
    {
        description: "Compiler allows declared parameters",
        params: [
            {
                source: `
                function test_params(X, Y) {
                    X = Y;
                }
                `,
                queries: {
                    "Params": { "test_params": [{ "$var": "X" }, 10] }
                }
            }
        ],
        debugKeys: ["generatedSource", "traces"],
        returns: {
            solutions: {
                "Params": [{ "X": 10 }]
            }
        }
    }
]