export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Destructuring array in the rule body",
        "params": [
            {
                "source": `
function test_array(Val) {
    var List;
    List = [10, 20, 30];
    [_, Val, _] = List;
}
`,
                "queries": {
                    "Destructure array in body": {
                        "test_array": [{"$var": "X"}]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Destructure array in body": [{"X": 20}],
            },
        },
    },
    {
        "description": "Destructuring object in the rule body",
        "params": [
            {
                "source": `
function test_object(Name) {
    var Person;
    Person = {name: 'alice', age: 30};
    ({name: Name, ..._} = Person);
}

`,
                "queries": {
                    "Destructure object in body": {
                        "test_object": [{"$var": "Y"}]
                    },
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Destructure object in body": [{"Y": "alice"}],
            },
        },
    },
    {
        "description": "Destructuring object shorthand in the rule body",
        "params": [
            {
                "source": `
function test_object_shorthand(name) {
    var Person;
    Person = {name: 'bob', age: 40};
    ({name, ..._} = Person);
}
`,
                "queries": {
                    "Destructure object with shorthand": {
                        "test_object_shorthand": [{"$var": "Z"}]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Destructure object with shorthand": [{"Z": "bob"}]
            },
        },
    },
]