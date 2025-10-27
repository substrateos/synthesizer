export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Unification via assignment operator (=)",
    "params": [{
      "source": `
// Unify a variable with a literal.
function assign_literal(X) {
    X = 'test';
}

// Unify two variables.
function assign_vars(X, Y) {
    X = Y;
}

// Chained unification.
function assign_chain(A, B, C) {
    A = B;
    B = C;
}

// Unification failure.
function assign_fail(X) {
    X = 'a';
    X = 'b'; // This should fail.
}

// Unify with a complex structure.
function assign_struct(X, Y) {
    X = {val: [10, Y]};
}
`,
      "queries": {
        "Unify var with literal": {
          "assign_literal": [{ "$var": "V" }]
        },
        "Unify two vars (1)": {
          "assign_vars": [{ "$var": "V" }, "hello"]
        },
        "Unify two vars (2)": {
          "assign_vars": ["world", { "$var": "V" }]
        },
        "Chained unification": {
          "assign_chain": [{ "$var": "P" }, { "$var": "Q" }, "final"]
        },
        "Unification should fail": {
          "assign_fail": [{ "$var": "V" }]
        },
        "Unify with a structure": {
          "assign_struct": [{ "$var": "Struct" }, "inner"]
        }
      }
    }],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
      "solutions": {
        "Unify var with literal": [{ "V": "test" }],
        "Unify two vars (1)": [{ "V": "hello" }],
        "Unify two vars (2)": [{ "V": "world" }],
        "Chained unification": [{ "P": "final", "Q": "final" }],
        "Unification should fail": [],
        "Unify with a structure": [{ "Struct": { "val": [10, "inner"] } }]
      },
    }
  }
]