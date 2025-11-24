export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "config.compile(): Dynamic compilation and execution",
        "params": [{
            "source": `
                function dynamic_run(Code, Input, Output) {
                    var Predicate = Logic.compile(Code);
                    Predicate(Input, Output);
                }
            `,
            "queries": {
                "Dynamic Double": {
                    "dynamic_run": [
                        "export default function double(In, Out) { Out = Logic.js(In * 2); }",
                        10,
                        { "$var": "R" }
                    ]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Dynamic Double": [{ "R": 20 }]
            }
        }
    },
    {
        "description": "config.compile(): Dynamic compilation with named exports",
        "params": [{
            "source": `
                function dynamic_namespace(Code, R1, R2) {
                    var {one, two} = Logic.compile(Code);
                    one(R1);
                    two(R2);
                }
            `,
            "queries": {
                "Named Exports": {
                    "dynamic_namespace": [
                        "export function one(X){X=1;} export function two(X){X=2;}",
                        { "$var": "A" },
                        { "$var": "B" }
                    ]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Named Exports": [{ "A": 1, "B": 2 }]
            }
        }
    }
]
