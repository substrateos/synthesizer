export const attributes = {
  type: "example/json"
}

export default [{
    "description": "Tests for arithmetic computation using Number()",
    "params": [{
        "source": `
// Rule for addition
function add(A, B, Sum) {
  Sum = Number(A + B);
}

// Rule for multiplication and addition
function total(Price, Quantity, Tax, Total) {
  Total = Number(Price * Quantity + Tax);
}
`,
        "queries": {
            "Simple addition": {
                "add": [10, 5, {
                    "$var": "S"
                }]
            },
            "Verify a correct sum": {
                "add": [10, 5, 15]
            },
            "Fail an incorrect sum": {
                "add": [10, 5, 10]
            },
            "More complex computation": {
                "total": [20, 2, 5, {
                    "$var": "T"
                }]
            }
        }
    }],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
        "solutions": {
            "Simple addition": [{
                "S": 15
            }],
            "Verify a correct sum": [{}],
            "Fail an incorrect sum": [],
            "More complex computation": [{
                "T": 45
            }]
        }
    }
}, {
    "description": "Tests for comparison operators",
    "params": [{
        "source": `
// Rule to check if someone is an adult.
function is_adult(Age) {
  Age >= 18;
}

// Rule to check if a number is within a range.
function in_range(X, Min, Max) {
  X >= Min;
  X < Max;
}
`,
        "queries": {
            "is_adult succeeds": {
                "is_adult": [21]
            },
            "is_adult fails": {
                "is_adult": [10]
            },
            "is_adult succeeds at boundary": {
                "is_adult": [18]
            },
            "in_range succeeds": {
                "in_range": [5, 0, 10]
            },
            "in_range fails (too low)": {
                "in_range": [-1, 0, 10]
            },
            "in_range fails (at max boundary)": {
                "in_range": [10, 0, 10]
            }
        }
    }],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
        "solutions": {
            "is_adult succeeds": [{}],
            "is_adult fails": [],
            "is_adult succeeds at boundary": [{}],
            "in_range succeeds": [{}],
            "in_range fails (too low)": [],
            "in_range fails (at max boundary)": []
        }
    }
}]
