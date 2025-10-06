export const attributes = {
    type: "example/json"
}

export default {
    "description": "Finds all instances of the word 'function' in the 'source' attribute of units, including index and capture groups.",
    "params": [
        {
            "pattern": "(function)",
            "units": [
                {
                    "name": "adder",
                    "unit": {
                        "type": "javascript",
                        "source": "/**\n * Adds numbers together.\n * @function\n */\nfunction(a, b) {\n    return a + b\n}"
                    }
                },
                {
                    "name": "subtractor",
                    "unit": {
                        "type": "javascript",
                        "source": "/**\n * Subtracts numbers.\n */\nconst subtractor = (a, b) => a - b;"
                    }
                },
                {
                    "name": "multiplier",
                    "unit": {
                        "type": "javascript",
                        "source": "const multiplier = function(x, y) { return x * y; }"
                    }
                }
            ],
            "attribute": "source"
        }
    ],
    "returns": [
        {
            "match": "function",
            "unit": {
                "type": "javascript",
                "source": "/**\n * Adds numbers together.\n * @function\n */\nfunction(a, b) {\n    return a + b\n}"
            },
            "name": "adder",
            "attribute": "source",
            "index": 34,
            "groups": null,
            "captures": [
                "function"
            ]
        },
        {
            "match": "function",
            "unit": {
                "type": "javascript",
                "source": "/**\n * Adds numbers together.\n * @function\n */\nfunction(a, b) {\n    return a + b\n}"
            },
            "name": "adder",
            "attribute": "source",
            "index": 47,
            "groups": null,
            "captures": [
                "function"
            ]
        },
        {
            "match": "function",
            "unit": {
                "type": "javascript",
                "source": "const multiplier = function(x, y) { return x * y; }"
            },
            "name": "multiplier",
            "attribute": "source",
            "index": 19,
            "groups": null,
            "captures": [
                "function"
            ]
        }
    ],
    "testFor": "search"
}
