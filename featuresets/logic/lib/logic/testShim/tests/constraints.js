export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Basic Constraint Deferral (Unbound > Value)",
        "params": [
            {
                "source": `
                function test_basic_defer(X) {
                    // 1. X is unbound. This should succeed immediately
                    //    and attach a constraint to X.
                    X > 10;
                    
                    // 2. Bind X to 5. The constraint wakes up: 5 > 10 is False.
                    //    This should FAIL.
                    X = 5;
                }

                function test_basic_success(X) {
                    X > 10;
                    // 2. Bind X to 15. 15 > 10 is True. Success.
                    X = 15;
                }
                `,
                "queries": {
                    "Should fail when constraint is violated later": {
                        "test_basic_defer": [{ "$var": "X" }]
                    },
                    "Should succeed when constraint is met later": {
                        "test_basic_success": [{ "$var": "X" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Should fail when constraint is violated later": [],
                "Should succeed when constraint is met later": [{ "X": 15 }]
            }
        }
    },
    {
        "description": "Multi-Variable Constraints (X > Y)",
        "params": [
            {
                "source": `
                function test_multi_var(X, Y) {
                    // 1. Both unbound. Constraint attaches to X and Y.
                    X > Y;

                    // 2. Bind X. Y is still unbound.
                    //    Check runs, sees Y is symbol, returns True (Defer).
                    X = 10;

                    // 3. Bind Y. All args ground.
                    //    Check runs: 10 > 5 is True. Success.
                    Y = 5;
                }

                function test_multi_var_fail(X, Y) {
                    X > Y;
                    X = 10;
                    Y = 20; // 10 > 20 is False. Fail.
                }
                `,
                "queries": {
                    "X(10) > Y(5)": {
                        "test_multi_var": [{ "$var": "X" }, { "$var": "Y" }]
                    },
                    "X(10) > Y(20) should fail": {
                        "test_multi_var_fail": [{ "$var": "X" }, { "$var": "Y" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "X(10) > Y(5)": [{ "X": 10, "Y": 5 }],
                "X(10) > Y(20) should fail": []
            }
        }
    },
    {
        "description": "Trace Migration (Constraints persist through Aliasing)",
        "params": [
            {
                "source": `
                function test_alias_migration(A, B) {
                    // 1. Constraint attached to A
                    A > 10;

                    // 2. A unified with B.
                    //    A's trace (containing the constraint) is concatenated to B.
                    A = B;

                    // 3. Bind B. This triggers B's trace.
                    //    The constraint originally on A should now check B's value.
                    B = 5; // 5 > 10 is False. Fail.
                }
                `,
                "queries": {
                    "Aliased constraint violation": {
                        "test_alias_migration": [{ "$var": "A" }, { "$var": "B" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Aliased constraint violation": []
            }
        }
    },
    {
        "description": "Constraints with Logic.js Arithmetic",
        "params": [
            {
                "source": `
                function test_arithmetic_constraint(N) {
                    // Constraint defined first
                    N < 50;

                    // Calculate value later
                    // 10 + 20 = 30.
                    // 30 < 50 is True.
                    N = Logic.js(10 + 20);
                }
                `,
                "queries": {
                    "Arithmetic result satisfies constraint": {
                        "test_arithmetic_constraint": [{ "$var": "N" }]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Arithmetic result satisfies constraint": [{ "N": 30 }]
            }
        }
    }
]
