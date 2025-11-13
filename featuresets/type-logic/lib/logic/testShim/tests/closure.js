export const attributes = {
  type: "example/json"
}

export default [
    {
        "description": "Test that nested rules have read-only access to parent variables",
        "params": [
            {
                "source": `
                    // The main test rule.
                    function test_readonly_closure(Final) {
                        // 1. Parent declares a variable A.
                        var A = 10;
                        var B;

                        // 2. Parent calls the nested rule. The rule will implicitly
                        //    read A. The parent's variable B is unified with
                        //    the child's Out parameter.
                        child_returns_result(B);

                        // 4. Parent uses B, which was bound via the child's Out parameter.
                        Final = B;

                        // --- Nested Rule Definition ---
                        // This rule takes an argument for its output.
                        function child_returns_result(Out) {
                            // 3. READS parent's A implicitly from the closure.
                            //    WRITES the result to its own local parameter Out.
                            Out = Logic.js(A + 5);
                        }
                    }
                `,
                "queries": {
                    "Implicit read and explicit return": {
                        "test_readonly_closure": [
                            {
                                "$var": "Final"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Implicit read and explicit return": [
                    {
                        "Final": 15
                    }
                ]
            }
        }
    }
]