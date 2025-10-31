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
    },
    {
        description: "Logic.findall with a complex template",
        params: [
            {
                source: `
            // --- Facts ---
            function course(id='6.001', title='SICP', hours=15) {}
            function course(id='8.01', title='Physics I', hours=12) {}
            function course(id='18.01', title='Calculus I', hours=10) {}

            // --- Rules ---
            
            // This rule uses findall to get all courses and
            // format them into a list of objects.
            function get_course_catalog(Catalog) {
                var ID, Title; // Template variables
                
                // Logic.findall(Template, Goal, ResultList)
                Logic.findall(
                    {id: ID, title: Title},
                    course(ID, Title, _),
                    Catalog
                );
            }
            `,
                queries: {
                    "get_catalog": { "get_course_catalog": [{ "$var": "C" }] }
                }
            }
        ],
        debugKeys: ["generatedSource", "traces", "predicates"],
        returns: {
            "solutions": {
                "get_catalog": [
                    {
                        "C": [
                            { "id": "6.001", "title": "SICP" },
                            { "id": "8.01", "title": "Physics I" },
                            { "id": "18.01", "title": "Calculus I" }
                        ]
                    }
                ]
            }
        }
    }
]
