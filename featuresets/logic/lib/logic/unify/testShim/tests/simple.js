export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "1.1: Trivial Identity",
    "params": [{ "term1": "hello", "term2": "hello", "bindings": {}, "location": { "rule": "1.1" } }],
    "returns": {}
  },
  {
    "description": "1.2: Trivial Mismatch",
    "params": [{ "term1": 100, "term2": 200, "bindings": {}, "location": { "rule": "1.2" } }],
    "returns": null
  },
  {
    "description": "2.1: Simple Binding",
    "params": [{ "term1": { "$var": "X" }, "term2": 42, "bindings": {}, "location": { "rule": "2.1" } }],
    "returns": {
      "X": {
        "value": 42,
        "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 42, "location": { "rule": "2.1" } }]
      }
    }
  },
  {
    "description": "2.2: Symmetric Binding",
    "params": [{ "term1": true, "term2": { "$var": "Y" }, "bindings": {}, "location": { "rule": "2.2" } }],
    "returns": {
      "Y": {
        "value": true,
        "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": true, "location": { "rule": "2.2" } }]
      }
    }
  },
  {
    "description": "2.3: Variable to Variable",
    "params": [{ "term1": { "$var": "A" }, "term2": { "$var": "B" }, "bindings": {}, "location": { "rule": "2.3" } }],
    "returns": {
      "A": {
        "value": { "$var": "B" },
        "trace": [{ "type": "BIND", "variable": { "$var": "B" }, "value": { "$var": "A" }, "location": { "rule": "2.3" } }]
      },
      "B": {
        "value": { "$var": "B" },
        "trace": null
      }
    }
  },
  {
    "description": "3.1: Resolution before Conflict",
    "params": [{
      "term1": { "$var": "X" },
      "term2": { "$var": "Y" },
      "bindings": {
        "X": { "value": 1, "trace": [] },
        "Y": { "value": 2, "trace": [] }
      },
      "location": { "rule": "3.1" }
    }],
    "returns": null
  },
  {
    "description": "3.2: Resolution before Success",
    "params": [{
      "term1": { "$var": "X" },
      "term2": 100,
      "bindings": {
        "X": { "value": 100, "trace": [] }
      },
      "location": { "rule": "3.2" }
    }],
    "returns": {
      "X": { "value": 100, "trace": [] }
    }
  },
  {
    "description": "4.1: Deeply Nested Structure",
    "params": [{ "term1": { "user": { "id": { "$var": "ID" } }, "tags": ["a", { "$var": "T" }] }, "term2": { "user": { "id": 123 }, "tags": ["a", "b"] }, "bindings": {}, "location": { "rule": "4.1" } }],
    "returns": {
      "ID": {
        "value": 123,
        "trace": [{ "type": "BIND", "variable": { "$var": "ID" }, "value": 123, "location": { "rule": "4.1" } }]
      },
      "T": {
        "value": "b",
        "trace": [{ "type": "BIND", "variable": { "$var": "T" }, "value": "b", "location": { "rule": "4.1" } }]
      }
    }
  },
  {
    "description": "4.2: Array Length Mismatch",
    "params": [{ "term1": [1, 2], "term2": [1, 2, 3], "bindings": {}, "location": { "rule": "4.2" } }],
    "returns": null
  },
  {
    "description": "4.3: Object Key Mismatch",
    "params": [{ "term1": { "a": 1 }, "term2": { "b": 1 }, "bindings": {}, "location": { "rule": "4.3" } }],
    "returns": null
  },
  {
    "description": "5.1: Class Instance Success",
    "params": [{ "term1": { "$class": "Point", "args": [10, 20] }, "term2": { "$class": "Point", "args": [10, 20] }, "bindings": {}, "location": { "rule": "5.1" } }],
    "returns": {}
  },
  {
    "description": "5.2: Class Instance Type Failure",
    "params": [{ "term1": { "$class": "Point", "args": [10] }, "term2": { "$class": "Vector", "args": [10] }, "bindings": {}, "location": { "rule": "5.2" } }],
    "returns": null
  },
  {
    "description": "6.1: Occurs Check Failure",
    "params": [{ "term1": { "$var": "X" }, "term2": { "prop": { "$var": "X" } }, "bindings": {}, "location": { "rule": "6.1" } }],
    "returns": null
  },
  {
    "description": "6.2: Custom Unifier Success",
    "params": [{ "term1": 10, "term2": { "$constraint": "isPositive" }, "bindings": {}, "location": { "rule": "6.2" } }],
    "returns": {}
  },
  {
    "description": "6.3: Custom Unifier Failure",
    "params": [{ "term1": -10, "term2": { "$constraint": "isPositive" }, "bindings": {}, "location": { "rule": "6.3" } }],
    "returns": null
  },
]
