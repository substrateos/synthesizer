export const attributes = {
    type: "example/json"
}

export default [{
    "description": "Custom Unifier: ArrayPattern de-structuring",
    "params": [{
        "term1": {
            "$class": "ArrayPattern",
            "args": [
                [{ "$var": "H" }], { "$var": "T" }
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
}]