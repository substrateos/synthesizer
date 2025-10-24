export const attributes = {
  type: "example/json"
}

export default [
    {
        "description": "Support findall",
        "params": [
            {
                "source": `
// Facts
function member(g='a', m=1) {}
function member(g='a', m=2) {}
function member(g='b', m=3) {}

// Rule
function find_all_members(Group, Members) {
    var X;
    Logic.findall(X, member(Group, X), Members);
}
                `,
                "queries": {
                    "Find all for group 'a'": {
                        "find_all_members": [
                            "a",
                            {
                                "$var": "M"
                            }
                        ]
                    }
                }
            }
        ],
        "debugKeys": [
            "generatedSource",
            "predicates",
            "traces"
        ],
        "returns": {
            "solutions": {
                "Find all for group 'a'": [
                    {
                        "M": [
                            1,
                            2,
                        ]
                    }
                ]
            }
        }
    }
]
