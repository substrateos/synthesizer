export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "LHS: Destructuring in Rule Head (Head/Tail)",
        "params": [
            {
                "source": `
            // Valid LHS: Rest is last
            function head_tail([H, ...T], Head, Tail) { Head = H; Tail = T; }
            // Valid LHS: Fixed elements and rest
            function two_rest([A, B, ...T], ResA, ResB, ResT) {
                ResA = A; ResB = B; ResT = T;
            }
        `,
                "queries": {
                    "head_tail_ok": { "head_tail": [[1, 2, 3], { "$var": "H" }, { "$var": "T" }] },
                    "head_tail_one": { "head_tail": [[1], { "$var": "H" }, { "$var": "T" }] },
                    "head_tail_empty": { "head_tail": [[], { "$var": "H" }, { "$var": "T" }] },
                    "two_rest_fail_short": { "two_rest": [[1], { "$var": "A" }, { "$var": "B" }, { "$var": "T" }] }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "head_tail_ok": [{ "H": 1, "T": [2, 3] }],
                "head_tail_one": [{ "H": 1, "T": [] }],
                "head_tail_empty": [],
                "two_rest_fail_short": []
            }
        }
    },
    {
        "description": "RHS: Construction with Flexible Spread Syntax",
        "params": [
            {
                "source": `
            // Test simple RHS construction
            function cons(H, T, Result) {
                Result = [H, ...T];
            }
            // Test complex RHS construction
            function build_complex(Pre, Mid, Post, Result) {
                Result = [...Pre, ...Mid, ...Post];
            }
        `,
                "queries": {
                    "construct_simple": { "cons": [1, [2, 3], { "$var": "L" }] },
                    "construct_complex": { "build_complex": [[1, 2], [3, 4], [5, 6], { "$var": "L" }] },
                    "unify_rhs_pattern": { "build_complex": [[1, 2], { "$var": "M" }, [5, 6], [1, 2, 3, 4, 5, 6]] }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "construct_simple": [{ "L": [1, 2, 3] }],
                "construct_complex": [{ "L": [1, 2, 3, 4, 5, 6] }],
                "unify_rhs_pattern": [{ "M": [3, 4] }]
            }
        }
    },
    {
        "description": "Unification: Constructed Pattern vs. Concrete Value (2-step)",
        "params": [
            {
                "source": `
            // Helper to create a pattern [A, ...T]
            function make_simple_pattern(A, T, P) { P = [A, ...T]; }
            // Helper to create a pattern [A, ...Mid, C]
            function make_complex_pattern(A, Mid, C, P) { P = [A, ...Mid, C]; }

            // Test: Create pattern, then unify it. This tests back-propagation.
            function test_simple_unify(A, T, P_out) {
                var P;
                make_simple_pattern(A, T, P);
                P = [1, 2, 3]; // Unification goal
                P_out = P;
            }

            // Test: Unify a complex pattern
            function test_complex_unify(M, P_out) {
                var P;
                make_complex_pattern(1, M, 4, P);
                P = [1, 2, 3, 4]; // Unification goal
                P_out = P;
            }
        `,
                "queries": {
                    "simple_unify_pattern_vs_value": {
                        "test_simple_unify": [{ "$var": "A" }, { "$var": "T" }, { "$var": "P" }]
                    },
                    "complex_unify_pattern_vs_value": {
                        "test_complex_unify": [{ "$var": "M" }, { "$var": "P" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "simple_unify_pattern_vs_value": [{ "A": 1, "T": [2, 3], "P": [1, 2, 3] }],
                "complex_unify_pattern_vs_value": [{ "M": [2, 3], "P": [1, 2, 3, 4] }]
            }
        }
    },
    {
        "description": "Error: Spreading Non-Array in RHS",
        "params": [
            {
                "source": `
            function make_bad_pattern(T, P) { P = [1, ...T]; }
        `,
                "queries": {
                    "spread_string": { "make_bad_pattern": ["not-an-array", { "$var": "P" }] }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "throws": {
            "name": "Error",
            "message": "Cannot ground ArrayPattern: spread variable 'T' was bound to a non-array value."
        }
    },
    {
        "description": "Error: Unification Ambiguity (Multiple Unbound Rests)",
        "params": [
            {
                "source": `
            // This creates a pattern with two unbound spread variables
            function make_ambiguous(A, B, P) { P = [...A, 1, ...B]; }
            function test_ambiguous(A, B, P) {
                make_ambiguous(A, B, P);
                P = [0, 1, 2, 1, 3];
            }
        `,
                "queries": {
                    "ambiguous_unification": {
                        "test_ambiguous": [{ "$var": "A" }, { "$var": "B" }, { "$var": "P" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                // technically there is a valid solution that a tweak to our algorithm *should* be able to find.
                "ambiguous_unification": [{
                    "A": [0], "B": [2, 1, 3], "P": [0, 1, 2, 1, 3]
                }],
            },
        }
    },
    {
        "description": "Pattern vs. Pattern (Both Unbound)",
        "params": [
            {
                "source": `
            function makeP1(A, T, P) { P = [A, ...T]; }
            function makeP2(S, P) { P = [1, ...S]; }
            function test_p_vs_p(A, T, S) {
                var P1, P2;
                makeP1(A, T, P1); // P1 = [A, ...T]
                makeP2(S, P2); // P2 = [1, ...S]
                P1 = P2; // Unify two unbound patterns
            }
        `,
                "queries": {
                    "pattern_vs_pattern": {
                        "test_p_vs_p": [{ "$var": "A" }, { "$var": "T" }, { "$var": "S" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "pattern_vs_pattern": [{ "A": 1, "T": { "$var": "S" }, "S": { "$var": "S" } }]
            }
        }
    }
]