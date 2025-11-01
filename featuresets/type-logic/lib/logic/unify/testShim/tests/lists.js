export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Custom Unifier: ArrayPattern de-structuring",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [{ "$var": "H" }],
                    { "$var": "T" }
                ]
            },
            "term2": [1, 2, 3],
            "bindings": {},
            "location": { "rule": "list-pattern-test" }
        }],
        "returns": {
            "H": {
                "value": 1,
                "trace": [{
                    "type": "BIND",
                    "variable": { "$var": "H" },
                    "value": 1,
                    "location": { "rule": "list-pattern-test" }
                }]
            },
            "T": {
                "value": [2, 3],
                "trace": [{
                    "type": "BIND",
                    "variable": { "$var": "T" },
                    "value": [2, 3],
                    "location": { "rule": "list-pattern-test" }
                }]
            }
        }
    },
    {
        "description": "T2: [...X, 1] vs. [a, b, 1] (Standard Test)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": ["a", "b", 1],
            "bindings": {},
            "location": { "rule": "T2" }
        }],
        "returns": {
            "X": {
                "value": ["a", "b"],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": ["a", "b"], "location": { "rule": "T2" } }]
            }
        }
    },
    {
        "description": "T3: [...X, 1] vs. [a, b, 2] (Failure Test)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": ["a", "b", 2],
            "bindings": {},
            "location": { "rule": "T3" }
        }],
        "returns": null
    },
    {
        "description": "T4: [...X, 1] vs. [1] (Edge Case - Spread is empty)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": [1],
            "bindings": {},
            "location": { "rule": "T4" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T4" } }]
            }
        }
    },
    {
        "description": "T5: [...X, 1] vs. [] (Failure Test - Not enough elements)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": [],
            "bindings": {},
            "location": { "rule": "T5" }
        }],
        "returns": null
    },
    {
        "description": "T6: [1, ...X] vs. [1, 2, 3] (Classic Head/Tail)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [[1], { "$var": "X" }]
            },
            "term2": [1, 2, 3],
            "bindings": {},
            "location": { "rule": "T6" }
        }],
        "returns": {
            "X": {
                "value": [2, 3],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [2, 3], "location": { "rule": "T6" } }]
            }
        }
    },
    {
        "description": "T7: [...X] vs. [] (Empty Spread)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }]
            },
            "term2": [],
            "bindings": {},
            "location": { "rule": "T7" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T7" } }]
            }
        }
    },
    {
        "description": "T8: [1, ...X, 5] vs. [1, 2, 3, 4, 5] (Middle Spread)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [1],
                    { "$var": "X" },
                    [5]
                ]
            },
            "term2": [1, 2, 3, 4, 5],
            "bindings": {},
            "location": { "rule": "T8" }
        }],
        "returns": {
            "X": {
                "value": [2, 3, 4],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [2, 3, 4], "location": { "rule": "T8" } }]
            }
        }
    },
    {
        "description": "T9: [1, ...X, 5] vs. [1, 5] (Empty Middle Spread)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [1],
                    { "$var": "X" },
                    [5]
                ]
            },
            "term2": [1, 5],
            "bindings": {},
            "location": { "rule": "T9" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T9" } }]
            }
        }
    },
    {
        "description": "T10: [1, ...X, 5] vs. [1, 2, 3, 4, 6] (Failure Test - Mismatched end)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [1],
                    { "$var": "X" },
                    [5]
                ]
            },
            "term2": [1, 2, 3, 4, 6],
            "bindings": {},
            "location": { "rule": "T10" }
        }],
        "returns": null
    },
    {
        "description": "T11: [...X, 2, ...Y] vs. [1, 2, 3] (Split Spread)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "X" },
                    [2],
                    { "$var": "Y" }
                ]
            },
            "term2": [1, 2, 3],
            "bindings": {},
            "location": { "rule": "T11" }
        }],
        "returns": {
            "X": {
                "value": [1],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [1], "location": { "rule": "T11" } }]
            },
            "Y": {
                "value": [3],
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": [3], "location": { "rule": "T11" } }]
            }
        }
    },
    {
        "description": "T12: [...X, ...Y] vs. [1, 2, 3] (Ambiguous Spread - checks precedence)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "X" },
                    { "$var": "Y" }
                ]
            },
            "term2": [1, 2, 3],
            "bindings": {},
            "location": { "rule": "T12" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T12" } }]
            },
            "Y": {
                "value": [1, 2, 3],
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": [1, 2, 3], "location": { "rule": "T12" } }]
            }
        }
    },
    {
        "description": "T13: [...X, 1, ...Y] vs. [a, b, 2, c, d] (Failure Test - Mismatched middle)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "X" },
                    [1],
                    { "$var": "Y" }
                ]
            },
            "term2": ["a", "b", 2, "c", "d"],
            "bindings": {},
            "location": { "rule": "T13" }
        }],
        "returns": null
    },
    {
        "description": "T14: [...X, 1, ...Y] vs. [1] (Empty splits)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "X" },
                    [1],
                    { "$var": "Y" }
                ]
            },
            "term2": [1],
            "bindings": {},
            "location": { "rule": "T14" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T14" } }]
            },
            "Y": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": [], "location": { "rule": "T14" } }]
            }
        }
    },
    {
        "description": "T15: [...X] vs. [...Y] (Symmetric Spread vs. Spread)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }]
            },
            "term2": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "Y" }]
            },
            "bindings": {},
            "location": { "rule": "T15" }
        }],
        "returns": {
            "X": {
                "value": { "$var": "Y" },
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": { "$var": "Y" }, "location": { "rule": "T15" } }]
            }
        }
    },
    {
        "description": "T16: [...X, 1] vs. [...Y, 1] (Symmetric Complex vs. Complex)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "Y" }, [1]]
            },
            "bindings": {},
            "location": { "rule": "T16" }
        }],
        "returns": {
            "X": {
                "value": { "$var": "Y" },
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": { "$var": "Y" }, "location": { "rule": "T16" } }]
            }
        }
    },
    {
        "description": "T17: [...X, 1] vs. [...Y, 2] (Symmetric Failure)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [1]]
            },
            "term2": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "Y" }, [2]]
            },
            "bindings": {},
            "location": { "rule": "T17" }
        }],
        "returns": null
    },
    {
        "description": "T18: [...X, 1, ...Y] vs. [...A, 1, ...B] (Super Symmetric)",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "X" },
                    [1],
                    { "$var": "Y" }
                ]
            },
            "term2": {
                "$class": "ArrayPattern",
                "args": [
                    { "$var": "A" },
                    [1],
                    { "$var": "B" }
                ]
            },
            "bindings": {},
            "location": { "rule": "T18" }
        }],
        "returns": {
            "X": {
                "value": { "$var": "A" },
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": { "$var": "A" }, "location": { "rule": "T18" } }]
            },
            "Y": {
                "value": { "$var": "B" },
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$var": "B" }, "location": { "rule": "T18" } }]
            }
        }
    },
    {
        "description": "T19: (Mergesort Bug) Pattern-vs-Pattern unification with pre-bound variables",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [{ "$var": "X1" }],
                    { "$var": "XT" }
                ]
            },
            "term2": { "$var": "All" },
            "bindings": {
                "All": {
                    "value": {
                        "$class": "ArrayPattern",
                        "args": [
                            { "$var": "xs" },
                            { "$var": "ys" }
                        ]
                    },
                    "trace": []
                },
                "xs": {
                    "value": [3, 5, 1],
                    "trace": []
                },
                "ys": {
                    "value": [2, 6, 4],
                    "trace": []
                }
            },
            "location": { "rule": "T19" }
        }],
        "returns": {
            "X1": {
                "value": 3,
                "trace": [{ "type": "BIND", "variable": { "$var": "X1" }, "value": 3, "location": { "rule": "T19" } }]
            },
            "XT": {
                "value": [5, 1, 2, 6, 4],
                "trace": [{ "type": "BIND", "variable": { "$var": "XT" }, "value": [5, 1, 2, 6, 4], "location": { "rule": "T19" } }]
            },
            "All": {
                "value": {
                    "parts": [
                        { "$var": "xs" },
                        { "$var": "ys" }
                    ]
                },
                "trace": []
            },
            "xs": {
                "value": [3, 5, 1],
                "trace": []
            },
            "ys": {
                "value": [2, 6, 4],
                "trace": []
            },
        }
    },
    {
        "description": "T20: (Grounding) Grounding a nested pattern during unifyAgainstArray",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [3]]
            },
            "term2": [1, 2, 3],
            "bindings": {
                "X": {
                    "value": {
                        "$class": "ArrayPattern",
                        "args": [[1], { "$var": "Y" }]
                    },
                    "trace": []
                },
                "Y": { "value": [2], "trace": [] }
            },
            "location": { "rule": "T20" }
        }],
        "returns": {
            "X": {
                "value": { "parts": [[1], { "$var": "Y" }] },
                "trace": []
            },
            "Y": { "value": [2], "trace": [] }
        }
    },
    {
        "description": "T21: (Symmetric Fallback) Unify two partially unbound patterns",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [[1], { "$var": "X" }]
            },
            "term2": { "$var": "All" },
            "bindings": {
                "All": {
                    "value": {
                        "$class": "ArrayPattern",
                        "args": [{ "$var": "Y" }, [2]]
                    },
                    "trace": []
                }
            },
            "location": { "rule": "T21" }
        }],
        "returns": {
            "All": {
                "value": { "parts": [{ "$var": "Y" }, [2]] },
                "trace": []
            },
            "X": {
                "value": [2],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [2], "location": { "rule": "T21" } }]
            },
            "Y": {
                "value": [1],
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": [1], "location": { "rule": "T21" } }]
            }
        }
    },
    {
        "description": "T22: (T19 Fix) Unify two patterns that ground to concrete, equal arrays",
        "params": [{
            "term1": { "$var": "A" },
            "term2": { "$var": "B" },
            "bindings": {
                "A": {
                    "value": {
                        "$class": "ArrayPattern",
                        "args": [[1], { "$var": "X" }]
                    },
                    "trace": []
                },
                "B": {
                    "value": {
                        "$class": "ArrayPattern",
                        "args": [{ "$var": "Y" }, [2]]
                    },
                    "trace": []
                },
                "X": { "value": [2], "trace": [] },
                "Y": { "value": [1], "trace": [] }
            },
            "location": { "rule": "T22" }
        }],
        "returns": {
            "A": {
                "value": { "parts": [[1], { "$var": "X" }] },
                "trace": []
            },
            "B": {
                "value": { "parts": [{ "$var": "Y" }, [2]] },
                "trace": []
            },
            "X": { "value": [2], "trace": [] },
            "Y": { "value": [1], "trace": [] }
        }
    },
    {
        "description": "T23: (Non-Greedy Split) Test `...X, Y` logic with `Y` as a fixed (non-spread) part",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [{ "$var": "Y" }]]
            },
            "term2": [1, 2, 3],
            "bindings": {},
            "location": { "rule": "T23" }
        }],
        "returns": {
            "X": {
                "value": [1, 2],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [1, 2], "location": { "rule": "T23" } }]
            },
            "Y": {
                "value": 3,
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": 3, "location": { "rule": "T23" } }]
            }
        }
    },
    {
        "description": "T24: (Non-Greedy Split) Failing lookahead due to pre-bound var",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [{ "$var": "Y" }]]
            },
            "term2": [1, 2, 3],
            "bindings": {
                "Y": { "value": 4, "trace": [] }
            },
            "location": { "rule": "T24" }
        }],
        "returns": null
    },
    {
        "description": "T25: (Non-Greedy Split) Multiple spreads and fixed parts `...X, Y, ...Z`",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [{ "$var": "X" }, [{ "$var": "Y" }], { "$var": "Z" }]
            },
            "term2": [1, 2, 3, 4],
            "bindings": {},
            "location": { "rule": "T25" }
        }],
        "returns": {
            "X": {
                "value": [],
                "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": [], "location": { "rule": "T25" } }]
            },
            "Y": {
                "value": 1,
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": 1, "location": { "rule": "T25" } }]
            },
            "Z": {
                "value": [2, 3, 4],
                "trace": [{ "type": "BIND", "variable": { "$var": "Z" }, "value": [2, 3, 4], "location": { "rule": "T25" } }]
            }
        }
    },
    {
        "description": "T26: Fixed part [X] grounds to [1, 2] but should ground to [[1, 2]]",
        "params": [{
            "term1": {
                "$class": "ArrayPattern",
                "args": [
                    [{ "$var": "X" }]
                ]
            },
            "term2": [1, 2],
            "bindings": {
                "X": { "value": [1, 2], "trace": [] }
            },
            "location": { "rule": "T26" }
        }],
        "returns": null
    }
]
