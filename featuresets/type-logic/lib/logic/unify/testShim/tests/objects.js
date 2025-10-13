export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Object Unification: Subset matching (destructuring)",
    "params": [{
      "term1": { "name": { "$var": "Name" } },
      "term2": { "name": "alice", "age": 30 },
      "bindings": {}
    }],
    "returns": {
      "Name": {
        "value": "alice",
        "trace": [
          { "type": "BIND", "variable": { "$var": "Name" }, "value": "alice" }
        ]
      }
    }
  },
  {
    "description": "Object Unification: Subset matching failure (missing key)",
    "params": [{
      "term1": { "address": { "$var": "Addr" } },
      "term2": { "name": "alice", "age": 30 },
      "bindings": {}
    }],
    "returns": null
  },
  {
    "description": "Object Unification: Exact match (still works)",
    "params": [{
      "term1": { "name": { "$var": "Name" }, "age": { "$var": "Age" } },
      "term2": { "name": "bob", "age": 40 },
      "bindings": {}
    }],
    "returns": {
      "Name": {
        "value": "bob",
        "trace": [
          { "type": "BIND", "variable": { "$var": "Name" }, "value": "bob" }
        ]
      },
      "Age": {
        "value": 40,
        "trace": [
          { "type": "BIND", "variable": { "$var": "Age" }, "value": 40 }
        ]
      }
    }
  },
  {
    "description": "Object Unification: Nested subset matching",
    "params": [{
      "term1": { "data": { "value": { "$var": "V" } } },
      "term2": { "id": 123, "data": { "value": "found", "status": "ok" } },
      "bindings": {}
    }],
    "returns": {
      "V": {
        "value": "found",
        "trace": [
          { "type": "BIND", "variable": { "$var": "V" }, "value": "found" }
        ]
      }
    }
  },
  {
    "description": "Custom Unifier: ObjectPattern de-structuring",
    "params": [{
      "term1": {
        "$class": "ObjectPattern",
        "args": [{
          "name": { "$var": "Name" },
          "age": { "$var": "Age" }
        }]
      },
      "term2": { "name": "alice", "age": 30, "city": "nyc" },
      "bindings": {},
      "location": { "rule": "object-pattern-test" }
    }],
    "returns": {
      "Name": {
        "value": "alice",
        "trace": [{
          "type": "BIND",
          "variable": { "$var": "Name" },
          "value": "alice",
          "location": { "rule": "object-pattern-test" }
        }]
      },
      "Age": {
        "value": 30,
        "trace": [{
          "type": "BIND",
          "variable": { "$var": "Age" },
          "value": 30,
          "location": { "rule": "object-pattern-test" }
        }]
      }
    }
  }, {
    "description": "Custom Unifier: ObjectPattern failure on missing key",
    "params": [{
      "term1": {
        "$class": "ObjectPattern",
        "args": [{
          "name": { "$var": "Name" },
          "country": { "$var": "Country" }
        }]
      },
      "term2": { "name": "alice", "age": 30, "city": "nyc" },
      "bindings": {}
    }],
    "returns": null
  },
]
