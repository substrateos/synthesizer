export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Test the Byrd Box Tracing Model (CALL, EXIT, REDO, FAIL)",
    "params": [
      {
        "source": `
        function data(val='a') {}
        function data(val='b') {}
        
        function check(val='b') {}
        function check(val='c') {}
        
        function test_trace(X) {
            data(X);
            check(X);
        }
        `,
        "queries": {
          "Find the one solution": {
            "test_trace": [
              {
                "$var": "X"
              }
            ]
          }
        }
      }
    ],
    "debugKeys": [
      "predicates",
      "generatedSource",
    ],
    "returns": {
      "solutions": {
        "Find the one solution": [
          {
            "X": "b"
          }
        ]
      },
      "traces": {
        "Find the one solution": [
          "CALL: (1) test_trace(X)",
          "  CALL: (2) data(X)",
          "  EXIT: (2) data(X = \"a\")",
          "  CALL: (3) check(\"a\")",
          "  FAIL: (3) check(\"a\")",
          "  REDO: (2) data(X = \"a\")",
          "  EXIT: (2) data(X = \"b\")",
          "  CALL: (4) check(\"b\")",
          "  EXIT: (4) check(\"b\")",
          "EXIT: (1) test_trace(X = \"b\")",
          "REDO: (1) test_trace(X = \"b\")",
          "  REDO: (4) check(\"b\")",
          "  FAIL: (4) check(\"b\")",
          "FAIL: (1) test_trace(X)"
        ]
      }
    }
  }
]