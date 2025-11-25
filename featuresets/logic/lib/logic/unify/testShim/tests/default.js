export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Value.optional(X, 10) vs. undefined (Missing value)",
        "params": [
            {
                "term1": { "$optional": [{ "$var": "X" }, 10] },
                // "term2": undefined,
                "bindings": {},
                "location": { "rule": "V-Opt-Missing" }
            }
        ],
        "returns": {
            "X": { "value": 10, "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 10, "location": { "rule": "V-Opt-Missing" } }] }
        }
    },
    {
        "description": "Value.optional(X, 10) vs. 20 (Provided value)",
        "params": [
            {
                "term1": { "$optional": [{ "$var": "X" }, 10] },
                "term2": 20,
                "bindings": {},
                "location": { "rule": "V-Opt-Provided" }
            }
        ],
        "returns": {
            "X": { "value": 20, "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 20, "location": { "rule": "V-Opt-Provided" } }] }
        }
    },
    {
        "description": "Value.optional(X, 10) vs. 10 (Matching value)",
        "params": [
            {
                "term1": { "$optional": [{ "$var": "X" }, 10] },
                "term2": 10,
                "bindings": {},
                "location": { "rule": "V-Opt-Match" }
            }
        ],
        "returns": {
            "X": { "value": 10, "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 10, "location": { "rule": "V-Opt-Match" } }] }
        }
    },
    {
        "description": "Value.required(X, 10) vs. undefined (Missing value)",
        "params": [
            {
                "term1": { "$required": [{ "$var": "X" }, 10] },
                // "term2": undefined,
                "bindings": {},
                "location": { "rule": "V-Req-Missing" }
            }
        ],
        "returns": null
    },
    {
        "description": "Value.required(X, 10) vs. 20 (Provided value, Fails)",
        "params": [
            {
                "term1": { "$required": [{ "$var": "X" }, 10] },
                "term2": 20,
                "bindings": {},
                "location": { "rule": "V-Req-Provided-Fail" }
            }
        ],
        "returns": null
    },
    {
        "description": "Value.required(X, 10) vs. 10 (Matching value)",
        "params": [
            {
                "term1": { "$required": [{ "$var": "X" }, 10] },
                "term2": 10,
                "bindings": {},
                "location": { "rule": "V-Req-Match" }
            }
        ],
        "returns": {
            "X": { "value": 10, "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 10, "location": { "rule": "V-Req-Match" } }] }
        }
    },
    {
        "description": "Value.required(X, 10) vs. Y (Unbound var)",
        "params": [
            {
                "term1": { "$required": [{ "$var": "X" }, 10] },
                "term2": { "$var": "Y" },
                "bindings": {},
                "location": { "rule": "V-Req-Unbound" }
            }
        ],
        "returns": {
            "X": { "value": { "$var": "Y" }, "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$var": "X" }, "location": { "rule": "V-Req-Unbound" } }] },
            "Y": { "value": 10, "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": 10, "location": { "rule": "V-Req-Unbound" } }] },
        }
    }
]
