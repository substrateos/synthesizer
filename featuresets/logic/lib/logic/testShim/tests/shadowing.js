export const attributes = {
  type: "example/json"
}

export default [
    {
        "description": "Tests for predicate shadowing and the fallback mechanism",
        "params": [
            {
                "source": `
                    // 1. The Global Predicate
                    // This is the rule that should be 'shadowed' by a local definition.
                    function status(S) {
                        S = 'global';
                    }

                    // 2. The Test Rule with a Shadowing Predicate
                    // This rule calls status(S), which should resolve to its own
                    // local version of status/1.
                    function test_shadowing(S) {
                        // The local, shadowing predicate.
                        function status(S) {
                            S = 'local';
                        }
                        // This call should find the local rule first.
                        status(S);
                    }

                    // 3. A Test Rule to Prove Fallback-on-Failure
                    // This rule's local status/1 is designed to always fail.
                    function test_fallback(S) {
                        // This local predicate will always fail, forcing the engine
                        // to backtrack and try the global fallback.
                        function status(S) {
                            1 === 2; // This goal always fails.
                            S = 'local_fail';
                        }
                        status(S);
                    }
                `,
                "queries": {
                    "Should find all solutions, local first, then global on backtrack": {
                        "test_shadowing": [
                            {
                                "$var": "S"
                            }
                        ]
                    },
                    "Should fall back to global when the local rule fails": {
                        "test_fallback": [
                            {
                                "$var": "S"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Should find all solutions, local first, then global on backtrack": [
                    { "S": "local" },
                    { "S": "global" }
                ],
                "Should fall back to global when the local rule fails": [
                    { "S": "global" }
                ]
            }
        }
    }
]
