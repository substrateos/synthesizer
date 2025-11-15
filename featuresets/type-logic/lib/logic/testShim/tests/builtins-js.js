export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Test Logic.js() for basic string concatenation",
    "params": [{
      "source": `
        // Rule to test Logic.js for string concatenation
        function join_str(A, B, R) {
          R = Logic.js(A + " " + B);
        }
      `,
      "queries": {
        "Join_Literals": {
          "join_str": ["foo", "bar", { "$var": "R" }]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Join_Literals": [
          { "R": "foo bar" }
        ]
      }
    }
  },
  {
    "description": "Test Logic.js() for basic string concatenation",
    "params": [{
      "source": `
        // Rule to test Logic.js for string concatenation
        function join_str(A, B, R) {
          R = Logic.js(A + " " + B);
        }
      `,
      "queries": {
        "Join_Literals": {
          "join_str": ["foo", "bar", { "$var": "R" }]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Join_Literals": [
          { "R": "foo bar" }
        ]
      }
    }
  },
  {
    "description": "Test Logic.js() resolves logic variables before evaluation",
    "params": [{
      "source": `
        // A simple fact-like rule
        function part1(P) {
          P = "Hello";
        }
        
        // Rule to test Logic.js for string concatenation
        function join_str(A, B, R) {
          R = Logic.js(A + " " + B);
        }

        // Rule to test Logic.js with a resolved variable
        function test_join_var(R) {
          var P;
          part1(P);
          join_str(P, "World", R);
        }
      `,
      "queries": {
        "Join_Variable": {
          "test_join_var": [{ "$var": "R" }]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Join_Variable": [
          { "R": "Hello World" }
        ]
      }
    }
  },
  {
    "description": "Test Logic.js() with advanced JS (IIFE, class, loop, if, arrow fn)",
    "params": [{
      "source": `
        function advanced_js_test(A, B, Result) {
          // This rule provides the values for A and B
          A = 5;
          B = [10, 20];
          
          // The complex IIFE
          Result = Logic.js((() => {
              // 1. Class Syntax
              class Util {
                  constructor(base) {
                      this.base = base;
                  }
                  // 4. Arrow function used in method
                  multiplyList(list) {
                      return list.map(x => x * this.base);
                  }
              }
        
              // 2. 'if' statement
              let multiplier;
              if (A > 3) {
                  multiplier = A; // A is 5, so multiplier becomes 5
              } else {
                  multiplier = 1;
              }
        
              const util = new Util(multiplier);
              const multipliedArr = util.multiplyList(B); // [10, 20] -> [50, 100]
        
              // 3. 'for...of' loop
              let sum = 0;
              for (const val of multipliedArr) {
                  sum += val; // 50 + 100
              }
        
              return sum; // Final result: 150
          
          })()); // A=5, B=[10, 20] are passed in
        }
      `,
      "queries": {
        "Advanced_IIFE_Test": {
          "advanced_js_test": [
            { "$var": "A_val" },
            { "$var": "B_val" },
            { "$var": "R_val" }
          ]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Advanced_IIFE_Test": [
          { "A_val": 5, "B_val": [10, 20], "R_val": 150 }
        ]
      }
    }
  }
]

