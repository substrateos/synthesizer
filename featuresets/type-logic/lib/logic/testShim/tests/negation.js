export const attributes = {
  type: "example/json"
}

export default [{
    "description": "Tests for negation-as-failure",
    "params": [{
        "source": `
// Facts
function is_minor(age=10) {}
function is_minor(age=15) {}

// Rule
function can_not_vote(Age) {
    !is_minor(Age);
}
`,
        "queries": {
            "Should succeed for an adult": {
                "can_not_vote": [20]
            },
            "Should fail for a minor": {
                "can_not_vote": [15]
            }
        }
    }],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
        "solutions": {
            "Should succeed for an adult": [{}],
            "Should fail for a minor": []
        }
    }
}]
