export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Destructuring in the rule body",
        "params": [
            {
                "source": `
function test_array(Val) {
    var List;
    List = [10, 20, 30];
    [_, Val, _] = List;
}

function test_object(Name) {
    var Person;
    Person = {name: 'alice', age: 30};
    ({name: Name} = Person);
}

function test_object_shorthand(name) {
    var Person;
    Person = {name: 'bob', age: 40};
    ({name} = Person);
}
`,
                "queries": {
                    "Destructure array in body": {
                        "test_array": [{"$var": "X"}]
                    },
                    "Destructure object in body": {
                        "test_object": [{"$var": "Y"}]
                    },
                    "Destructure object with shorthand": {
                        "test_object_shorthand": [{"$var": "Z"}]
                    }
                }
            }
        ],
        "debugKeys": ["generatedSource", "predicates", "traces"],
        "returns": {
            "solutions": {
                "Destructure array in body": [{"X": 20}],
                "Destructure object in body": [{"Y": "alice"}],
                "Destructure object with shorthand": [{"Z": "bob"}]
            },
        },
    }
]