export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Rule Head: Standard object default should fail",
        "params": [
            {
                "source": `
// Object: Fails on missing key, as per README caveats
function test_object_default({a = 10}, R=a) {}
                `,
                "queries": {
                    "Standard object default should fail": {
                        "test_object_default": [
                            {},
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
        "description": "Rule Head: Standard array default should fail",
        "params": [
            {
                "source": `
// Array: Fails on length mismatch, as per README caveats
function test_array_default([A = 10], R=A) {}
                `,
                "queries": {
                    "Standard array default should fail": {
                        "test_array_default": [
                            [],
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
        "description": "Rule Head: Logic.optional object should succeed",
        "params": [
            {
                "source": `
// Object: Logic.optional handles missing key
function test_object_logic_default({a = Logic.optional(10)}, R=a) {}
                `,
                "queries": {
                    "Logic.optional object should succeed": {
                        "test_object_logic_default": [
                            {},
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
        "description": "Rule Head: Logic.optional array should succeed",
        "params": [
            {
                "source": `
// Array: Logic.optional handles length mismatch
function test_array_logic_default([A = Logic.optional(10)], R=A) {}
                `,
                "queries": {
                    "Logic.optional array should succeed": {
                        "test_array_logic_default": [
                            [],
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
        "description": "Rule Head: Nested standard default should fail",
        "params": [
            {
                "source": `
// Nested standard default should FAIL
function test_nested_std({a: {b = 10} = {}}, R=b) {}
                `,
                "queries": {
                    "Nested standard default should fail": {
                        "test_nested_std": [
                            {},
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
        "description": "Rule Head: Standard array partial default should fail",
        "params": [
            {
                "source": `
// Array: Fails on length mismatch, as per README caveats
function test_array_partial_default([A, B = 99], R_A, R_B) {
    R_A = A;
    R_B = B;
}
                `,
                "queries": {
                    "Standard array partial default should fail": {
                        "test_array_partial_default": [
                            [1],
                            {
                                "$var": "A"
                            },
                            {
                                "$var": "B"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Standard array partial default should fail": []
            }
        }
    }
]
