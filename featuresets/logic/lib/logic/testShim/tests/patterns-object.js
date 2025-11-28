export const attributes = {
  type: "example/json"
};

export default [
  {
    description: "LHS: Destructuring in Rule Head",
    params: [
      {
        source: `
          // Valid LHS: Rest is last. Renamed ...R to ...RR to bypass transpiler var bug.
          function get_a_rest({a, ...RR}, A, Rest) { A = a; Rest = RR; }
        `,
        queries: {
          destructure_ok: {get_a_rest: [{"a": 1, "b": 2, "c": 3}, {"$var": "A"}, {"$var": "R"}]},
          destructure_empty_rest: {get_a_rest: [{"a": 1}, {"$var": "A"}, {"$var": "R"}]},
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        destructure_ok: [{"A": 1, "R": {"b": 2, "c": 3}}],
        destructure_empty_rest: [{"A": 1, "R": {}}],
      }
    }
  },
  {
    description: "LHS: Destructuring in Rule Head",
    params: [
      {
        source: `
          // Valid LHS: Renamed ...Rest to ...RR to bypass transpiler var bug.
          function destructure_it({a, b, c, ...RR}, A, B, C, R) {
            A=a; B=b; C=c; R=RR;
          }
        `,
        queries: {
          destructure_all: {destructure_it: [{"a": 1, "b": 2, "c": 3, "d": 4, "e": 5}, {"$var": "A"}, {"$var": "B"}, {"$var": "C"}, {"$var": "R"}]},
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        destructure_all: [{"A": 1, "B": 2, "C": 3, "R": {"d": 4, "e": 5}}],
      }
    }
  },
  {
    description: "LHS: Destructuring in Rule Head",
    params: [
      {
        source: `
          // Valid LHS pattern for failure test
          function pattern_ab({a, b, ...T}) {}
        `,
        queries: {
          fail_missing_prop: {pattern_ab: [{"a": 1, "c": 3}]}
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        fail_missing_prop: []
      }
    }
  },
  {
    description: "RHS: Construction with Flexible Spread Syntax",
    params: [
      {
        source: `
          // Simple RHS construction
          function add_a(R, Result) {
            Result = {a: 1, ...R};
          }
        `,
        queries: {
          construct_simple: {add_a: [{"b": 2, "c": 3}, {"$var": "Obj"}]},
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        construct_simple: [{"Obj": {"a": 1, "b": 2, "c": 3}}],
      }
    }
  },
  {
    description: "RHS: Construction with Flexible Spread Syntax",
    params: [
      {
        source: `
          // Complex RHS construction with multiple spreads
          function build_complex(R1, R2, Result) {
            // R2's 'b' property will overwrite the 'b: 2'
            Result = {a: 1, ...R1, b: 2, ...R2, c: 3};
          }

          // Test property overwriting
          function build_overwrite(R1, R2, Obj) {
            // {a:1, c:3, b:2, a:99, d:4, b:100} -> {c:3, a:99, d:4, b:100}
            Obj = {a: 1, ...R1, b: 2, a: 99, ...R2};
          }
        `,
        queries: {
          construct_complex: {build_complex: [{"e": 5}, {"f": 6, "b": 99}, {"$var": "Obj"}]},
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        construct_complex: [{"Obj": {"a": 1, "e": 5, "b": 99, "f": 6, "c": 3}}],
      }
    }
  },
  {
    description: "RHS: Construction with Flexible Spread Syntax",
    params: [
      {
        source: `
          // Test property overwriting
          function build_overwrite(R1, R2, Obj) {
            // {a:1, c:3, b:2, a:99, d:4, b:100} -> {c:3, a:99, d:4, b:100}
            Obj = {a: 1, ...R1, b: 2, a: 99, ...R2};
          }
        `,
        queries: {
          ground_overwrite: {build_overwrite: [{"c": 3}, {"d": 4, "b": 100}, {"$var": "Obj"}]},
          ground_unbound_rest: {build_overwrite: [{"$var": "R1"}, {"d": 4}, {"$var": "Obj"}]}
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        ground_overwrite: [{"Obj": {"c": 3, "a": 99, "d": 4, "b": 100}}],
        ground_unbound_rest: [{
          "Obj": {"$objectPattern": [{"a": 99, "b": 2, "d": 4}, {"$var": "R1"}]},
          "R1": {"$var": "R1"}
        }]
      }
    }
  },
  {
    description: "Unification: Constructed Pattern vs. Concrete Value (2-step)",
    params: [
      {
        source: `
          // Helper to create a simple pattern {a:A, ...T}
          function make_simple_pattern(A, T, P) { P = {a: A, ...T}; }

          // Helper to create a complex pattern {a:1, ...R1, b:2, ...R2}
          function make_complex_pattern(R1, R2, P) {
            P = {a: 1, ...R1, b: 2, ...R2};
          }

          // Test: Create pattern, then unify it.
          // This tests back-propagation of bindings to A and T.
          function test_simple_unify(A, T, P_out) {
            var P;
            make_simple_pattern(A, T, P);
            P = {a: 1, b: 2, c: 3}; // Unification goal
            P_out = P;
          }

          // Test: Unify a complex pattern with multiple spreads
          // This tests the deterministic non-greedy logic.
          function test_complex_unify(R1, R2, P_out) {
            var P;
            make_complex_pattern(R1, R2, P);
            P = {a: 1, e: 5, c: 3, b: 2, f: 6};
            P_out = P;
          }
        `,
        queries: {
          simple_unify_pattern_vs_value: {test_simple_unify: [{"$var": "A"}, {"$var": "T"}, {"$var": "P"}]},
          complex_unify_pattern_vs_value: {test_complex_unify: [{"$var": "R1"}, {"$var": "R2"}, {"$var": "P"}]}
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        simple_unify_pattern_vs_value: [
          {
            "A": 1,
            "T": {"b": 2, "c": 3},
            "P": {"a": 1, "b": 2, "c": 3}
          }
        ],
        complex_unify_pattern_vs_value: [
          {
            "R1": {},
            "R2": {"e": 5, "c": 3, "f": 6},
            "P": {"a": 1, "e": 5, "c": 3, "b": 2, "f": 6}
          }
        ]
      }
    }
  },
  {
    description: "Error: Spreading Non-Object in RHS",
    params: [
      {
        source: `
          function make_bad_pattern(T, P) { P = {a:1, ...T}; }
        `,
        queries: {
          spread_string: {make_bad_pattern: ["not_an_object", {"$var": "P"}]}
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    throws: {
      name: "Error",
      message: "Cannot ground ObjectPattern: spread variable 'T' was bound to a non-object value."
    }
  },
  {
    description: "Error: Pattern vs. Pattern (Both Unbound)",
    params: [
      {
        source: `
          function makeP1(R, P) { P = {a: 1, ...R}; }
          function makeP2(S, P) { P = {b: 2, ...S}; }
          function test_p_vs_p(R, S) {
            var P1, P2;
            makeP1(R, P1);
            makeP2(S, P2);
            P1 = P2; // Unify two unbound patterns
          }
        `,
        queries: {
          pattern_vs_pattern: { test_p_vs_p: [{ "$var": "R" }, { "$var": "S" }] }
        }
      }
    ],
    debugKeys: ["generatedSource", "traces"],
    returns: {
      solutions: {
        pattern_vs_pattern: [
          {
            "R": {
              "$objectPattern": [
                {
                  "b": 2
                },
                {
                  "$var": "Pivot"
                }
              ]
            },
            "S": {
              "$objectPattern": [
                {
                  "a": 1
                },
                {
                  "$var": "Pivot"
                }
              ]
            }
          }
        ]
      }
    }
  }
];
