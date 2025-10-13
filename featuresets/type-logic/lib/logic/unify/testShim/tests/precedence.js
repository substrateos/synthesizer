export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Precedence: A custom pattern unifier should be executed against a concrete value.",
        "params": [{
            "term1": { "$constraint": "deconstructsArray" },
            "term2": ["head_val", "tail_val"],
            "bindings": {}
        }],
        "returns": {
            "H": {
                "value": "head_val",
                "trace": [{ "type": "BIND", "variable": { "$var": "H" }, "value": "head_val" }]
            }
        }
    },
    {
        "description": "Precedence: A variable should be bound to a pattern object, not execute it.",
        "params": [{
            "term1": { "$constraint": "deconstructsArray" },
            "term2": { "$var": "Y" },
            "bindings": {}
        }],
        "returns": {
            "Y": {
                "value": { "$constraint": "deconstructsArray" },
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$constraint": "deconstructsArray" } }]
            }
        }
    },
    {
        "description": "Precedence: The symmetric case (variable vs. pattern) should also bind.",
        "params": [{
            "term1": { "$var": "Y" },
            "term2": { "$constraint": "deconstructsArray" },
            "bindings": {}
        }],
        "returns": {
            "Y": {
                "value": { "$constraint": "deconstructsArray" },
                "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$constraint": "deconstructsArray" } }]
            }
        }
    }
]