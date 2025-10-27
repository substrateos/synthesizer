export const attributes = {
    type: "example/json"
}

export default [{
    "description": "Simple rule that always succeeds",
    "params": [
        {
            "source": `
/**
 * A rule that is always true.
 */
function always_succeeds() {
    // An empty body signifies success.
}
            `,
            "queries": {
                "Should succeed with a simple, empty-body rule": {
                    "always_succeeds": []
                }
            }
        }
    ],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
        "solutions": {
            "Should succeed with a simple, empty-body rule": [
                {}
            ]
        },
    }
}]