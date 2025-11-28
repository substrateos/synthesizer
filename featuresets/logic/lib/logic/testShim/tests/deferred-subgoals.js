export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Basic Deferred Subgoal Execution",
    "params": [
      {
        "source": `
        // A simple predicate to call later
        function is_ten(V1) {
            V1 = 10;
        }

        function test_late_binding(Pred, Val) {
            // Call unbound variable 'Pred'.
            // This should defer.
            Pred(Val);

            // Bind Val (argument). Pred is still unbound.
            // Goal remains deferred.
            Val = 10;

            // Bind Pred to 'is_ten'.
            // Goal wakes up -> is_ten(10) -> Success.
            Pred = is_ten;
        }
        `,
        "queries": {
          "Late Binding Success": {
            "test_late_binding": [{ "$var": "P" }, { "$var": "V" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Late Binding Success": [
          { "V": 10 }
        ]
      }
    }
  },
  {
    "description": "Chained/Aliased Deferred Subgoals",
    "params": [
      {
        "source": `
        function val(X, V) { X = V; }

        function test_chain(A, B, Res) {
            // Defer call on A
            A(Res, 100);

            // Alias A = B. 
            // The pending goal should migrate or be shared with B.
            A = B;

            // Bind B.
            //    This should wake up the goal attached to A (via B).
            B = val;
        }
        `,
        "queries": {
          "Aliased Execution": {
            "test_chain": [{ "$var": "A" }, { "$var": "B" }, { "$var": "R" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Aliased Execution": [
          { "R": 100 }
        ]
      }
    }
  },
  {
    "description": "Deferred Subgoal with Backtracking",
    "params": [
      {
        "source": `
        // A predicate with two choices
        function pick(X) { X = 1; }
        function pick(X) { X = 2; }

        function test_forking(F, Res) {
            // Defer call
            F(Res);

            // Bind F to the branching predicate
            F = pick;

            // The woke goal should fork.
            // We should get two solutions for the whole query.
        }
        `,
        "queries": {
          "Woken Goal Forks": {
            "test_forking": [{ "$var": "F" }, { "$var": "R" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Woken Goal Forks": [
          { "R": 1 },
          { "R": 2 }
        ]
      }
    }
  },
  {
    "description": "Multiple Deferred Goals (Queue Ordering)",
    "params": [
      {
        "source": `
        function step1(L) { L = [1, ..._]; }
        function step2(L) { L = [_, 2]; }

        function test_ordering(List) {
            var F1, F2;
            // Queue two goals on different variables
            F1(List); // Adds 1 at head
            F2(List); // Adds 2 at tail

            // Trigger them
            F1 = step1;
            F2 = step2;
        }
        `,
        "queries": {
          "Multiple Wakeups": {
            "test_ordering": [{ "$var": "L" }]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Multiple Wakeups": [
          { "L": [1, 2] }
        ]
      }
    }
  }
]
