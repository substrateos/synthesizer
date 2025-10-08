export const attributes = {
    type: "example/json"
}

export default {
    "description": "Replaces multiple non-overlapping spans with their own unique replacements.",
    "params": [
        "The quick brown fox jumps over the lazy dog.",
        [
            { "start": 16, "end": 19, "replacement": "wolf" },
            { "start": 4, "end": 9, "replacement": "fast" },
            { "start": 35, "end": 43, "replacement": "sleeping cat" }
        ]
    ],
    "returns": "The fast brown wolf jumps over the sleeping cat."
}