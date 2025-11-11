export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "ExpressionStatement: Standard array default should fail",
        "params": [
            {
                "source": `
// Array: Fails on length mismatch, as per README caveats
function test_array_std(R) {
    var A;
    [A = 10] = []; // Fails, strict unification
    R = A;
}
                `,
                "queries": {
                    "Standard array default should fail": {
                        "test_array_std": [
                            {
                                "$var": "R"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Standard array default should fail": []
            }
        }
    },
    {
        "description": "ExpressionStatement: Standard object default should fail",
        "params": [
            {
                "source": `
// Object: Fails on missing key, as per README caveats
function test_obj_std(R) {
    var a;
    ({a = 10} = {}); // Fails, strict unification
    R = a;
}
                `,
                "queries": {
                    "Standard object default should fail": {
                        "test_obj_std": [
                            {
                                "$var": "R"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Standard object default should fail": []
            }
        }
    },
    {
        "description": "ExpressionStatement: Logic.optional array should succeed",
        "params": [
            {
                "source": `
// Array: Logic.optional handles length mismatch
function test_array_logic(R) {
    var A;
    [A = Logic.optional(10)] = [];
    R = A;
}
                `,
                "queries": {
                    "Logic.optional array should succeed": {
                        "test_array_logic": [
                            {
                                "$var": "R"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Logic.optional array should succeed": [
                    {
                        "R": 10
                    }
                ]
            }
        }
    },
    {
        "description": "ExpressionStatement: Logic.optional object should succeed",
        "params": [
            {
                "source": `
// Object: Logic.optional handles missing key
function test_obj_logic(R) {
    var a;
    ({a = Logic.optional(10)} = {});
    R = a;
}
                `,
                "queries": {
                    "Logic.optional object should succeed": {
                        "test_obj_logic": [
                            {
                                "$var": "R"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Logic.optional object should succeed": [
                    {
                        "R": 10
                    }
                ]
            }
        }
    },
    {
        "description": "ExpressionStatement: Nested standard default should fail",
        "params": [
            {
                "source": `
// Nested standard default should FAIL
function test_nested_std(R) {
    var b;
    // Fails on inner mismatch {b=10} vs {}
    ({a: {b = 10} = {}} = {}); 
    R = b;
}
                `,
                "queries": {
                    "Nested standard default should fail": {
                        "test_nested_std": [
                            {
                                "$var": "R"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Nested standard default should fail": []
            }
        }
    },
    {
        "description": "ExpressionStatement: Mean nested mixed Logic.optional should succeed",
        "params": [
            {
                "source": `
// Mean mixed nested Logic.optional should SUCCEED
function test_nested_mixed_logic(R_B, R_D) {
    var B, d;
    // Tests nested array and nested object defaults
    ({a: [B = Logic.optional(20)] = [], c: {d = Logic.optional(30)} = {}} = {..._});
    R_B = B;
    R_D = d;
}
                `,
                "queries": {
                    "Mean nested mixed Logic.optional should succeed": {
                        "test_nested_mixed_logic": [
                            {
                                "$var": "B"
                            },
                            {
                                "$var": "D"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Mean nested mixed Logic.optional should succeed": [
                    {
                        "B": 20,
                        "D": 30
                    }
                ]
            }
        }
    },
    {
        "description": "ExpressionStatement: Mean mixed standard/logic default should fail",
        "params": [
            {
                "source": `
// Mean mixed standard/logic default should FAIL
function test_nested_mixed_fail(R_B, R_D) {
    var B, d;
    // This should fail because {d=30} vs {} is a hard mismatch
    ({a: [B = Logic.optional(20)] = [], c: {d = 30} = {}} = {});
    R_B = B;
    R_D = d;
}
                `,
                "queries": {
                    "Mean mixed standard/logic default should fail": {
                        "test_nested_mixed_fail": [
                            {
                                "$var": "B"
                            },
                            {
                                "$var": "D"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Mean mixed standard/logic default should fail": []
            }
        }
    },
]