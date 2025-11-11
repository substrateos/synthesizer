export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Test Logic.optional/1 built-in",
        "params": [{
            "source": `
function test_default(Term, DefaultVal, Result) {
    Term = Logic.optional(DefaultVal);
    Result = Term;
}
`,
            "queries": {
                "Should_bind_unbound_var": {
                    "test_default": [{ "$var": "X" }, 10, { "$var": "R" }]
                },
                "Should_not_overwrite_bound_val": {
                    "test_default": [5, 10, { "$var": "R" }]
                },
                "Should_succeed_with_same_bound_val": {
                    "test_default": [10, 10, { "$var": "R" }]
                },
                "Should_succeed_with_ground_arg": {
                    "test_default": [5, 10, { "$var": "R" }]
                },
                "Should_bind_complex_default": {
                    "test_default": [{ "$var": "X" }, { "a": [1, 2] }, { "$var": "R" }]
                },
                "Should_bind_to_value_of_var": {
                    "test_default": [{ "$var": "X" }, "hello", { "$var": "R" }]
                },
                "Should_not_overwrite_partial_object": {
                    "test_default": [{ "z": { "$var": "Y" } }, { "a": 10, "b": 20 }, { "$var": "R" }]
                },
                "Should_not_overwrite_partial_array": {
                    "test_default": [[1, { "$var": "Y" }], [1, 2, 3], { "$var": "R" }]
                },
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Should_bind_unbound_var": [{"X": 10, "R": 10 }],
                "Should_not_overwrite_bound_val": [{ "R": 5 }],
                "Should_succeed_with_same_bound_val": [{ "R": 10 }],
                "Should_succeed_with_ground_arg": [{ "R": 5 }],
                "Should_bind_complex_default": [{ "X": { "a": [1, 2] }, "R": { "a": [1, 2] } }],
                "Should_bind_to_value_of_var": [{ "X": "hello", "R": "hello" }],
                "Should_not_overwrite_partial_object": [
                    { "Y": { "$var": "Y" }, "R": { "z": { "$var": "Y" } } }
                ],
                "Should_not_overwrite_partial_array": [
                    { "Y": { "$var": "Y" }, "R": [1, { "$var": "Y" }] }
                ],
            }
        }
    },
    {
        "description": "Test Logic.optional/1 built-in",
        "params": [{
            "source": `
// Test for a var bound to another var
function test_bound_to_var(R) {
    var Y;
    var X = Y; // X is bound to unbound var Y
    X = Logic.optional(10); // This should not bind X or Y
    R = X;
}
`,
            "queries": {
                "Should_apply_default_to_var_bound_to_var": {
                    "test_bound_to_var": [{ "$var": "R" }]
                },
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Should_apply_default_to_var_bound_to_var": [
                    { "R": 10 }
                ],
            }
        }
    }
]