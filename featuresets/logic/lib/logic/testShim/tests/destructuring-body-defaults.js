export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Rule body: `var {a = 10} = {...Z}`. Should bind `a = 10`.",
        "params": [{
            "source": `
function test_object_default(R) {
    var Z;
    var {a = 10} = {...Z}; // JS would bind a = 10
    R = a;
}
            `,
            "queries": {
                "Object default from empty": {
                    "test_object_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Object default from empty": [{ "R": 10 }]
            }
        }
    },
    {
        "description": "Rule body: `var [A = 10] = [...Z]`. Should bind `A = 10`.",
        "params": [{
            "source": `
function test_array_default(R) {
    var Z;
    var [A = 10] = [...Z]; // JS would bind A = 10
    R = A;
}
                `,
            "queries": {
                "Array default from empty": {
                    "test_array_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Array default from empty": [{ "R": 10 }]
            }
        }
    },
    {
        "description": "Rule body: `var [A = Logic.optional(99)] = []`. Should bind `A = 99`.",
        "params": [{
            "source": `
function test_array_logic_default(R) {
    // This is the logic-consistent version of the JS default.
    // Our compiler should find this goal.
    var [A = Logic.optional(99)] = [];
    R = A;
}
            `,
            "queries": {
                "Array Logic.optional from empty": {
                    "test_array_logic_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Array Logic.optional from empty": [{ "R": 99 }]
            }
        }
    },
    {
        "description": "Rule body: `var {a = Logic.optional(99)} = {...Z}`. Should bind `a = 99`.",
        "params": [{
            "source": `
function test_object_logic_default(R) {
    var Z;
    var {a = Logic.optional(99)} = {...Z};
    R = a;
}
            `,
            "queries": {
                "Object Logic.optional from empty": {
                    "test_object_logic_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Object Logic.optional from empty": [{ "R": 99 }]
            }
        }
    },
    {
        "description": "Rule body: `var {a = Logic.optional(99)} = {}`. Should bind `a = 99`.",
        "params": [{
            "source": `
function test_object_logic_default(R) {
    var {a = Logic.optional(99)} = {};
    R = a;
}
            `,
            "queries": {
                "Object Logic.optional from empty": {
                    "test_object_logic_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Object Logic.optional from empty": [{ "R": 99 }]
            }
        }
    },
    {
        "description": "Rule body: `var {a: {b = 10} = {...Y}} = {...Z}`. Should bind `b = 10`.",
        "params": [{
            "source": `
function test_nested_default(R) {
    // This is a complex but valid JS destructuring.
    var Z, Y;
    var {a: {b = 10} = {...Y}} = {...Z}; // JS binds a={b: 10}, b=10
    R = b;
}
            `,
            "queries": {
                "Nested default": {
                    "test_nested_default": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Nested default": [{ "R": 10 }]
            }
        }
    },
    {
        "description": "Rule body: `var [A, B = 99] = [1]`.",
        "params": [{
            "source": `
function test_array_partial_default(A, B) {
    var [X, Y = 99] = [1];
    A = X;
    B = Y;
}
            `,
            "queries": {
                "Array partial default": {
                    "test_array_partial_default": [{ "$var": "A" }, { "$var": "B" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Array partial default": []
            }
        }
    },
//     {
//         "description": "Rule body: `var {a = Logic.optional({b: Logic.optional(10)})} = {}`.",
//         "params": [
//             {
//                 "source": `
// function test_var_nested(R) {
//     var {a = Logic.optional({b: Logic.optional(10)})} = {};
//     R = b;
// }
//                 `,
//                 "queries": {
//                     "Nested in Var": {
//                         "test_var_nested": [
//                             {
//                                 "$var": "R"
//                             }
//                         ]
//                     }
//                 }
//             }
//         ],
//         "debugKeys": [
//             "generatedSource",
//             "traces"
//         ],
//         "returns": {
//             "solutions": {
//                 "Nested in Var": [
//                     {
//                         "R": 10
//                     }
//                 ]
//             }
//         }
//     },
]