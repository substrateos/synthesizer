export const attributes = {
  type: "example/json"
}

export default 
[
  {
    "description": "Test Logic.js() in solveAsync with a resolved Promise",
    "params": [{
      "source": `
            // Rule to test Logic.js with a resolved promise
            function get_data(X) {
              X = Logic.js(Promise.resolve('async data'));
            }
          `,
      "queries": {
        "Async_Resolve": {
          "get_data": [
            {
              "$var": "R"
            }
          ]
        }
      },
      "async": true
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Async_Resolve": [
          {
            "R": "async data"
          }
        ]
      }
    }
  },
  {
    "description": "Test Logic.js() in solveAsync with a rejected Promise (and fallback)",
    "params": [{
      "source": `
            // Rule 1: Tries to get data, but the promise will reject
            function get_data(X) {
              X = Logic.js(Promise.reject(new Error('API Failed')).catch(err => this.fail(err)));
            }
            // Rule 2: The fallback rule
            function get_data(X) {
              X = 'fallback';
            }
          `,
      "queries": {
        "Async_Reject_Fallback": {
          "get_data": [
            {
              "$var": "R"
            }
          ]
        }
      },
      "async": true
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Async_Reject_Fallback": [
          {
            "R": "fallback"
          }
        ]
      }
    }
  },
  {
    "description": "Test Logic.js() in solveAsync with a continuation (async + sync goal)",
    "params": [{
      "source": `
            // Sync rule for arithmetic
            function add(A, B, S) { 
              S = Number(A+B); 
            }
      
            // Async rule that fetches a number, then calls add
            function get_data_and_add(S) {
              var T;
              T = Logic.js(Promise.resolve(10));
              add(T, 5, S); // This is the continuation
            }
          `,
      "queries": {
        "Async_Continuation": {
          "get_data_and_add": [
            {
              "$var": "R"
            }
          ]
        }
      },
      "async": true
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Async_Continuation": [
          {
            "R": 15
          }
        ]
      }
    }
  },
  {
    "description": "Test logic.solve (sync) throws error on async Logic.js",
    "params": [{
      "source": `
            // This rule uses a promise, but in a sync solver context
            function get_data(X) {
              X = Logic.js(Promise.resolve('oops'));
            }
          `,
      "queries": {
        "Sync_Error": {
          "get_data": [
            {
              "$var": "R"
            }
          ]
        }
      },
      "async": false
    }],
    "debugKeys": ["generatedSource", "traces"],
    "throws": {"name": "Error", "message": "Async operation (await) detected in a 'logic.solve' block. Use 'logic.solveAsync' to enable asynchronous operations."},
  }
]
