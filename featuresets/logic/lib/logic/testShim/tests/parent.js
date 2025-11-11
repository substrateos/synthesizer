export const attributes = {
    type: "example/json"
}

export default [{
    "description": "A simple rule with a single sub-goal that resolves to facts",
    "params": [
        {
            "source": `
// Facts
function father(x='james', y='charles') {}
function father(x='charles', y='henry') {}

// Rule
function parent(X, Y) {
    father(X, Y);
}
            `,
            "queries": {
                "Check a known parent": {
                    "parent": ["james", "charles"]
                },
                "Find child of a known parent": {
                    "parent": ["james", { "$var": "Child" }]
                },
                "Find all parent-child pairs": {
                    "parent": [{ "$var": "Parent" }, { "$var": "Child" }]
                }
            }
        }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
        "solutions": {
            "Check a known parent": [
                {}
            ],
            "Find child of a known parent": [
                {
                    "Child": "charles"
                }
            ],
            "Find all parent-child pairs": [
                {
                    "Parent": "james",
                    "Child": "charles"
                },
                {
                    "Parent": "charles",
                    "Child": "henry"
                }
            ]
        },
    }
}]