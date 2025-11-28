export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Deferred Function Call in Constraint (X > F(Y))",
    "params": [
      {
        "source": `
        function test_lazy_math(X, Y, F) {
            // 1. Define constraint using unbound function F
            //    Evaluates to: X > F(Y)
            X > F(Y);

            // 2. Bind arguments (Constraint still deferred b/c F is unbound)
            X = 20;
            Y = 5;

            // 3. Bind F to a real JS function. 
            //    Constraint wakes up: 20 > (5 * 2) -> 20 > 10 -> True.
            F = Logic.js((n) => n * 2);
        }

        function test_lazy_math_fail(X, F) {
            X > F(10);
            F = Logic.js((n) => n); // Returns 10.
            X = 5;        // 5 > 10 is False. Fail.
        }
        `,
        "queries": {
          "Lazy Success": {
            "test_lazy_math": [{ "$var": "X" }, { "$var": "Y" }, { "$var": "F" }]
          },
          "Lazy Failure": {
            "test_lazy_math_fail": [{ "$var": "X" }, { "$var": "F" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Lazy Success": [
          { "X": 20, "Y": 5 } // F is opaque (function), usually strictly not returned or just empty
        ],
        "Lazy Failure": []
      }
    }
  },
  {
    "description": "Deferred Member Access in Constraint (X > Obj.prop)",
    "params": [
      {
        "source": `
        function test_lazy_prop(X, Obj) {
            // 1. Constraint depends on Obj.limit
            X < Obj.limit;

            // 2. Bind X
            X = 10;

            // 3. Bind Obj. Constraint wakes up.
            //    10 < 20 -> True.
            Obj = { limit: 20 };
        }
        `,
        "queries": {
          "Property Access": {
            "test_lazy_prop": [{ "$var": "X" }, { "$var": "Obj" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Property Access": [
          { "X": 10, "Obj": { "limit": 20 } }
        ]
      }
    }
  }
]
