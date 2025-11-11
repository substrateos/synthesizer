export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Test typeof operator for basic primitives",
        "params": [{
            "source": `
        function check_type(Value, Type) {
          // The 'typeof' operator should resolve the value of 'Value'
          // and return its JS type string, which unifies with 'Type'.
          Type = typeof Value;
        }
      `,
            "queries": {
                "String_Type": {
                    "check_type": ["Hello World", { "$var": "T" }]
                },
                "Number_Type": {
                    "check_type": [42, { "$var": "T" }]
                },
                "Boolean_Type": {
                    "check_type": [true, { "$var": "T" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "String_Type": [{ "T": "string" }],
                "Number_Type": [{ "T": "number" }],
                "Boolean_Type": [{ "T": "boolean" }]
            }
        }
    },
    {
        "description": "Test typeof operator for structural types (Object/Array)",
        "params": [{
            "source": `
        function check_type(Value, Type) {
          Type = typeof Value;
        }
      `,
            "queries": {
                "Object_Type": {
                    "check_type": [{ "a": 1 }, { "$var": "T" }]
                },
                // Note: In JS, typeof [] === 'object'
                "Array_Type": {
                    "check_type": [[1, 2], { "$var": "T" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Object_Type": [{ "T": "object" }],
                "Array_Type": [{ "T": "object" }]
            }
        }
    },
    {
        "description": "Test typeof operator on Functions (Predicates)",
        "params": [{
            "source": `
        // Define a dummy predicate
        function my_rule(X) {}

        function test_function_type(Result) {
          // Pass the predicate itself as an argument
          // typeof my_rule should be 'function'
          Result = typeof my_rule;
        }
      `,
            "queries": {
                "Func_Type": {
                    "test_function_type": [{ "$var": "R" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Func_Type": [{ "R": "function" }]
            }
        }
    },
    {
        "description": "Test typeof operator on unbound vs bound variables",
        "params": [{
            "source": `
        function bind_it(Var) {
            Var = 100;
        }

        function test_flow(R1, R2) {
            var X;
            // X is currently unbound (symbol)
            // Note: Unbound variables usually resolve to 'symbol' or 'undefined' depending on implementation,
            // but typically we care about bound values. 
            // Let's just test the bound case here to be safe.

            R1 = typeof X;
            
            bind_it(X);
            // X is now bound to 100
            R2 = typeof X;
        }
      `,
            "queries": {
                "Flow_Check": {
                    "test_flow": [{ "$var": "Type1" }, { "$var": "Type2" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Flow_Check": [
                    { "Type1": "symbol", "Type2": "number" }
                ]
            }
        }
    },
    {
        "description": "Test typeof operator on complex expressions",
        "params": [{
            "source": `
        function bind_it(Var) {
            Var = 100;
        }

        function test_flow(R1, R2) {
            var X;
            // X is currently unbound (symbol)
            // Note: Unbound variables usually resolve to 'symbol' or 'undefined' depending on implementation,
            // but typically we care about bound values. 
            // Let's just test the bound case here to be safe.
            
            bind_it(X);
            // X is now bound to 100
            R1 = typeof X;
            
            // Ensure it works dynamically
            R2 = typeof (Logic.js(X + 1)); // 101 -> number
        }
      `,
            "queries": {
                "Flow_Check": {
                    "test_flow": [{ "$var": "Type1" }, { "$var": "Type2" }]
                }
            }
        }],
        "debugKeys": ["generatedSource", "traces"],
        "throws": {
            "name": "Error",
            "message": "typeof can only be applied to simple expressions"
        },
    },
]