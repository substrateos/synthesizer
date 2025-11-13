export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Rule head destructuring tests",
    "params": [
      {
        "source": `
        // Rule to get the head of a list.
        function list_head([H, ..._], Head=H) {}
        
        // Rule to match a specific list structure.
        function is_point_list([P1 = {x:1, y:2}, P2 = {x:3, y:4}]) {}
        
        // Rule to get a person's name.
        function person_name({name: Name, age: _}, Result=Name) {}
        
        // Rule to match a specific object.
        function is_john({name='john', age=30}) {}
        `,
        "queries": {
          "Array: Get head of a list": {
            "list_head": [
              [10, 20, 30],
              { "$var": "H" }
            ]
          },
          "Array: Should fail to get head of empty list": {
            "list_head": [
              [],
              { "$var": "H" }
            ]
          },
          "Array: Match a specific list of objects": {
            "is_point_list": [
              [{ "x": 1, "y": 2 }, { "x": 3, "y": 4 }]
            ]
          },
          "Array: Fail to match a different list": {
            "is_point_list": [
              [{ "x": 9, "y": 9 }]
            ]
          },
          "Object: Get name from a person object": {
            "person_name": [
              { "name": "alice", "age": 25 },
              { "$var": "Name" }
            ]
          },
          "Object: Match a specific object": {
            "is_john": [
              { "name": "john", "age": 30 }
            ]
          },
          "Object: Fail to match a different object": {
            "is_john": [
              { "name": "jane", "age": 30 }
            ]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Array: Get head of a list": [{ "H": 10 }],
        "Array: Should fail to get head of empty list": [],
        "Array: Match a specific list of objects": [{}],
        "Array: Fail to match a different list": [],
        "Object: Get name from a person object": [{ "Name": "alice" }],
        "Object: Match a specific object": [{}],
        "Object: Fail to match a different object": []
      },
    }
  },
  {
    "description": "Test object destructuring with missing properties",
    "params": [{
      "source": `
  // Rule head destructuring
  function match_obj({a, b}) {}
  
  // Rule body destructuring
  function match_obj_body(V) {
    var {a, b} = V;
  }
  
  // Rule head with rest (should still fail if 'b' is missing)
  function match_obj_rest({a, b, ...R}) {}
          `,
      "queries": {
        "Head: Fails on missing prop": {
          "match_obj": [{ "a": 1 }]
        },
        "Head: Succeeds on full props": {
          "match_obj": [{ "a": 1, "b": 2 }]
        },
        "Body: Fails on missing prop": {
          "match_obj_body": [{ "a": 1 }]
        },
        "Rest: Fails on missing fixed prop": {
          "match_obj_rest": [{ "a": 1, "c": 3 }]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Head: Fails on missing prop": [],
        "Head: Succeeds on full props": [{}],
        "Body: Fails on missing prop": [],
        "Rest: Fails on missing fixed prop": []
      }
    }
  },
  {
    "description": "Test array destructuring with missing parameters (length mismatch)",
    "params": [{
      "source": `
  // Rule head destructuring
  function match_arr([A, B, C]) {}
  
  // Rule body destructuring
  function match_arr_body(V) {
    var [A, B, C] = V;
  }
  
  // Rule head with rest
  function match_arr_rest([A, B, ...R]) {}
          `,
      "queries": {
        "Head: Fails on missing param": {
          "match_arr": [[1, 2]]
        },
        "Head: Succeeds on full params": {
          "match_arr": [[1, 2, 3]]
        },
        "Body: Fails on missing param": {
          "match_arr_body": [[1, 2]]
        },
        "Head: Fails on empty list for fixed param": {
          "match_arr": [[]]
        },
        "Head (Rest): Fails on missing fixed param": {
          "match_arr_rest": [[1]]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Head: Fails on missing param": [],
        "Head: Succeeds on full params": [
          {}
        ],
        "Body: Fails on missing param": [],
        "Head: Fails on empty list for fixed param": [],
        "Head (Rest): Fails on missing fixed param": []
      }
    }
  },
  {
    "description": "Test object destructuring succeeds with Logic.optional",
    "params": [{
      "source": `
  // Rule head: 'b' is missing, but default is provided
  function match_obj_head({a, b = Logic.optional(99)}) {}
      `,
      "queries": {
        "Head: Succeeds on missing prop w/ default": {
          "match_obj_head": [{ "a": 1 }]
        },
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Head: Succeeds on missing prop w/ default": [{}],
      }
    }
  },
  {
    "description": "Test object destructuring succeeds with Logic.optional",
    "params": [{
      "source": `
  // Rule head: 'b' exists, default should be ignored
  function match_obj_head_exists({a, b = Logic.optional(99)}) {}
      `,
      "queries": {
        "Head: Succeeds on existing prop (default ignored)": {
          "match_obj_head_exists": [{ "a": 1, "b": 2 }]
        },
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Head: Succeeds on existing prop (default ignored)": [{}],
      }
    }
  },
  {
    "description": "Test object destructuring succeeds with Logic.optional",
    "params": [{
      "source": `
  // Rule body: 'b' is missing, but default is provided
  function match_obj_body(V) {
    var {a, b = Logic.optional(99)} = V;
  }
      `,
      "queries": {
        "Body: Succeeds on missing prop w/ default": {
          "match_obj_body": [{ "a": 1 }]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Body: Succeeds on missing prop w/ default": [{}]
      }
    }
  },
  {
    "description": "Test array destructuring with Logic.optional",
    "params": [{
      "source": `
  // Rule head: Length mismatch. This SHOULD FAIL because the
  // underlying array unification fails on length before
  // default values are ever considered.
  function match_arr_head([A, B, C = Logic.optional(99)]) {}
  
  // Rule body: Length mismatch. This SHOULD SUCCEED.
  // JS destructuring pads with 'undefined', which our
  // DefaultValue unifier should correctly intercept.
  function match_arr_body(V) {
    var [A, B, C = Logic.optional(99)] = V;
  }
      `,
      "queries": {
        "Head: Succeeds on length mismatch w/ default": {
          "match_arr_head": [[1, 2]]
        },
        "Body: Succeeds on length mismatch w/ default": {
          "match_arr_body": [[1, 2]]
        }
      }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
      "solutions": {
        "Head: Succeeds on length mismatch w/ default": [{}],
        "Body: Succeeds on length mismatch w/ default": [{}]
      }
    }
  }
]
