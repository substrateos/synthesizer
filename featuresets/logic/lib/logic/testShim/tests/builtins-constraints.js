export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Introspect constraints on a variable",
        "params": [
            {
                "source": `
                function test_constraints(X, List) {
                    // 1. Create constraints
                    X > 10;
                    X < 20;
                    
                    // 2. Introspect and Format
                    var Raw;
                    Raw = Logic.constraints(X);
                    
                    // Use Logic.js to map over the results and stringify the functions
                    List = Logic.js(Raw.map(c => ({
                        args: c.args,
                        fn: c.fn.toString()
                    })));
                }
                `,
                "queries": {
                    "Get constraint list": {
                        "test_constraints": [{ "$var": "X" }, { "$var": "List" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Get constraint list": [
                    {
                        "List": [
                            { "args": [{ "$var": "X" }], "fn": "(X) => X > 10" },
                            { "args": [{ "$var": "X" }], "fn": "(X) => X < 20" }
                        ],
                        "X": { "$var": "X" }
                    }
                ]
            }
        }
    },
    {
        "description": "Introspect constraints with Aliasing",
        "params": [
            {
                "source": `
                function test_alias_introspection(A, B, List) {
                    // 1. Constraint on A
                    A > 10;
                    
                    // 2. Alias A = B
                    A = B;

                    // 3. Constraint on B
                    B < 50;

                    // 4. Introspect A and Format
                    var Raw;
                    Raw = Logic.constraints(A);

                    List = Logic.js(Raw.map(c => ({
                        args: c.args,
                        fn: c.fn.toString()
                    })));
                }
                `,
                "queries": {
                    "Alias introspection": {
                        "test_alias_introspection": [{ "$var": "A" }, { "$var": "B" }, { "$var": "List" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Alias introspection": [
                    {
                        "List": [
                            { "args": [{ "$var": "B" }], "fn": "(A) => A > 10" },
                            { "args": [{ "$var": "B" }], "fn": "(B) => B < 50" }
                        ],
                        "A": { "$var": "B" },
                        "B": { "$var": "B" },
                    }
                ]
            }
        }
    }
]
