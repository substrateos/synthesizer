export const attributes = {
  type: "example/json"
}

export default [
  // ==========================================================================
  // 1. Fixed Property Matching
  // ==========================================================================
  {
    "description": "T1: {a: X} vs. {a: 1} (Simple fixed match)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "X" } }] },
        "term2": { "a": 1 },
        "bindings": {},
        "location": { "rule": "T1" }
      }
    ],
    "returns": {
      "X": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 1, "location": { "rule": "T1" } }]
      }
    }
  },
  {
    "description": "T2: {a: X} vs. {b: 1} (Fixed key mismatch)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "X" } }] },
        "term2": { "b": 1 },
        "bindings": {},
        "location": { "rule": "T2" }
      }
    ],
    "returns": null
  },
  {
    "description": "T3: {a: 1} vs. {a: 2} (Fixed value mismatch)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }] },
        "term2": { "a": 2 },
        "bindings": {},
        "location": { "rule": "T3" }
      }
    ],
    "returns": null
  },

  // ==========================================================================
  // 2. One-Sided Spreads (Pattern vs. Value)
  // ==========================================================================
  {
    "description": "T5: {...R} vs. {a: 1, b: 2} (Simple spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": {},
        "location": { "rule": "T5" }
      }
    ],
    "returns": {
      "R": {
        "value": { "a": 1, "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "a": 1, "b": 2 }, "location": { "rule": "T5" } }]
      }
    }
  },
  {
    "description": "T6: {...R} vs. {} (Empty spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }] },
        "term2": {},
        "bindings": {},
        "location": { "rule": "T6" }
      }
    ],
    "returns": {
      "R": {
        "value": {},
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": {}, "location": { "rule": "T6" } }]
      }
    }
  },
  {
    "description": "T7: {a: 1, ...R} vs. {a: 1, b: 2} (Fixed and spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "R" }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": {},
        "location": { "rule": "T7" }
      }
    ],
    "returns": {
      "R": {
        "value": { "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "b": 2 }, "location": { "rule": "T7" } }]
      }
    }
  },
  {
    "description": "T8: {...R, a: 1} vs. {a: 1, b: 2} (Spread and fixed)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }, { "a": 1 }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": {},
        "location": { "rule": "T8" }
      }
    ],
    "returns": {
      "R": {
        "value": { "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "b": 2 }, "location": { "rule": "T8" } }]
      }
    }
  },
  {
    "description": "T9: {a: 1, ...R, c: 3} vs. {a: 1, b: 2, c: 3} (Non-greedy middle spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "R" }, { "c": 3 }] },
        "term2": { "a": 1, "b": 2, "c": 3 },
        "bindings": {},
        "location": { "rule": "T9" }
      }
    ],
    "returns": {
      "R": {
        "value": { "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "b": 2 }, "location": { "rule": "T9" } }]
      }
    }
  },
  {
    "description": "T10: {a: 1, ...R, c: 3} vs. {a: 1, c: 3} (Empty middle spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "R" }, { "c": 3 }] },
        "term2": { "a": 1, "c": 3 },
        "bindings": {},
        "location": { "rule": "T10" }
      }
    ],
    "returns": {
      "R": {
        "value": {},
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": {}, "location": { "rule": "T10" } }]
      }
    }
  },
  {
    "description": "T11: {...R, ...S} vs. {a: 1, b: 2} (Non-greedy double spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }, { "$var": "S" }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": {},
        "location": { "rule": "T11" }
      }
    ],
    "returns": {
      "R": {
        "value": {},
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": {}, "location": { "rule": "T11" } }]
      },
      "S": {
        "value": { "a": 1, "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "S" }, "value": { "a": 1, "b": 2 }, "location": { "rule": "T11" } }]
      }
    }
  },
  {
    "description": "T12: {a: 1, ...R, b: X} vs. {a: 1, b: 2, c: 3} (Non-greedy with variable)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "R" }, { "b": { "$var": "X" } }] },
        "term2": { "a": 1, "b": 2, "c": 3 },
        "bindings": {},
        "location": { "rule": "T12" }
      }
    ],
    "returns": {
      "R": {
        "value": { "c": 3 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "c": 3 }, "location": { "rule": "T12" } }]
      },
      "X": {
        "value": 2,
        "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": 2, "location": { "rule": "T12" } }]
      }
    }
  },
  {
    "description": "T13: {a: 1, ...R, b: 2} vs. {a: 1, b: 3, c: 3} (Non-greedy failure)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "R" }, { "b": 2 }] },
        "term2": { "a": 1, "b": 3, "c": 3 },
        "bindings": {},
        "location": { "rule": "T13" }
      }
    ],
    "returns": null
  },

  // ==========================================================================
  // 3. Symmetric Unification (Pattern vs Pattern)
  //    NOTE: These now use the 'Pivot' strategy for open records.
  // ==========================================================================
  {
    "description": "T14: {...X} vs. {...Y} (Symmetric simple spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "X" }] },
        "term2": { "$objectPattern": [{ "$var": "Y" }] },
        "bindings": {},
        "location": { "rule": "T14" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$var": "Y" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$var": "X" }, "location": { "rule": "T14" } }]
      },
      "Y": {
        "value": { "$var": "Y" },
        "trace": null
      },
    }
  },
  {
    "description": "T15: {a: 1, ...X} vs. {...Y, a: 1} (Symmetric complex)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "X" }] },
        "term2": { "$objectPattern": [{ "$var": "Y" }, { "a": 1 }] },
        "bindings": {},
        "location": { "rule": "T15" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "X" }, "location": { "rule": "T15" } }]
      },
      "Y": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "Y" }, "location": { "rule": "T15" } }]
      },
      "Pivot": {
        "value": { "$var": "Pivot" },
        "trace": null
      }
    }
  },
  {
    "description": "T16: {a: X} vs. {a: Y} (Symmetric fixed)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "X" } }] },
        "term2": { "$objectPattern": [{ "a": { "$var": "Y" } }] },
        "bindings": {},
        "location": { "rule": "T16" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$var": "Y" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Y" }, "value": { "$var": "X" }, "location": { "rule": "T16" } }]
      },
      "Y": {
        "value": { "$var": "Y" },
        "trace": null
      }
    }
  },
  {
    "description": "T17: {a: 1, ...X} vs. {a: 1, ...Y} (Symmetric complex, should bind spreads)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "X" }] },
        "term2": { "$objectPattern": [{ "a": 1 }, { "$var": "Y" }] },
        "bindings": {},
        "location": { "rule": "T17" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "X" }, "location": { "rule": "T17" } }]
      },
      "Y": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "Y" }, "location": { "rule": "T17" } }]
      },
      "Pivot": {
        "value": { "$var": "Pivot" },
        "trace": null
      }
    }
  },
  {
    "description": "T18: {a: 1, ...X, c: 3} vs. {a: 1, ...Y, c: 3} (Symmetric middle spread)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "X" }, { "c": 3 }] },
        "term2": { "$objectPattern": [{ "a": 1 }, { "$var": "Y" }, { "c": 3 }] },
        "bindings": {},
        "location": { "rule": "T18" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "X" }, "location": { "rule": "T18" } }]
      },
      "Y": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "Y" }, "location": { "rule": "T18" } }]
      },
      "Pivot": {
        "value": { "$var": "Pivot" },
        "trace": null
      }
    }
  },
  {
    "description": "T19: {...R, a: 1} vs. {a: 1, b: 2} (R pre-bound to {b: 2})",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }, { "a": 1 }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": { "R": { "value": { "b": 2 }, "trace": [] } },
        "location": { "rule": "T19" }
      }
    ],
    "returns": {
      "R": { "value": { "b": 2 }, "trace": [] }
    }
  },
  {
    "description": "T20: {...R, a: 1} vs. {a: 1, b: 2} (R pre-bound to {c: 3}, should fail)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }, { "a": 1 }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": { "R": { "value": { "c": 3 }, "trace": [] } },
        "location": { "rule": "T20" }
      }
    ],
    "returns": null
  },
  {
    "description": "T21: {a: X, ...R} vs. {a: 1, b: 2} (X pre-bound to 1)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "X" } }, { "$var": "R" }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": { "X": { "value": 1, "trace": [] } },
        "location": { "rule": "T21" }
      }
    ],
    "returns": {
      "X": { "value": 1, "trace": [] },
      "R": {
        "value": { "b": 2 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "b": 2 }, "location": { "rule": "T21" } }]
      }
    }
  },
  {
    "description": "T22: {a: X, ...R} vs. {a: 1, b: 2} (X pre-bound to 2, should fail)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "X" } }, { "$var": "R" }] },
        "term2": { "a": 1, "b": 2 },
        "bindings": { "X": { "value": 2, "trace": [] } },
        "location": { "rule": "T22" }
      }
    ],
    "returns": null
  },
  {
    "description": "T23: {...R, a: 1} vs. {a: 1} (Symmetric, R should be empty)",
    "params": [
      {
        "term1": { "$objectPattern": [{ "$var": "R" }, { "a": 1 }]},
        "term2": { "a": 1 },
        "bindings": {},
        "location": { "rule": "T23" }
      }
    ],
    "returns": {
      "R": {
        "value": {},
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": {}, "location": { "rule": "T23" } }]
      }
    }
  },
  {
    "description": "T24: {a: 1} vs. {...R, a: 1} (Symmetric, R should be empty)",
    "params": [
      {
        "term1": { "a": 1 },
        "term2": { "$objectPattern": [{ "$var": "R" }, { "a": 1 }] },
        "bindings": {},
        "location": { "rule": "T24" }
      }
    ],
    "returns": {
      "R": {
        "value": {},
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": {}, "location": { "rule": "T24" } }]
      }
    }
  },
  {
    "description": "T25: {a: 1, ...X} vs. {a: 1, b: 2, ...Y} (Symmetric complex, X = {b: 2, ...Pivot})",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }, { "$var": "X" }] },
        "term2": { "$objectPattern": [{ "a": 1, "b": 2 }, { "$var": "Y" }] },
        "bindings": {},
        "location": { "rule": "T25" }
      }
    ],
    "returns": {
      "X": {
        "value": { "$objectPattern": [{ "b": 2 }, { "$var": "Pivot" }] },
        "trace": [{ "type": "BIND", "variable": { "$var": "X" }, "value": { "$objectPattern": [{ "b": 2 }, { "$var": "Pivot" }] }, "location": { "rule": "T25" } }]
      },
      "Y": {
        "value": { "$var": "Pivot" },
        "trace": [{ "type": "BIND", "variable": { "$var": "Pivot" }, "value": { "$var": "Y" }, "location": { "rule": "T25" } }]
      },
      "Pivot": {
        "value": { "$var": "Pivot" },
        "trace": null
      },
    }
  },

  // ==========================================================================
  // 4. Generic Object Unification (Plain objects)
  // ==========================================================================
  {
    "description": "Object Unification: Strict failure (subset not allowed)",
    "params": [
      {
        "term1": { "name": { "$var": "Name" } },
        "term2": { "name": "alice", "age": 30 },
        "bindings": {}
      }
    ],
    "returns": null
  },
  {
    "description": "Object Unification: Subset matching failure (missing key)",
    "params": [
      {
        "term1": { "address": { "$var": "Addr" } },
        "term2": { "name": "alice", "age": 30 },
        "bindings": {}
      }
    ],
    "returns": null
  },
  {
    "description": "Object Unification: Exact match (still works)",
    "params": [
      {
        "term1": { "name": { "$var": "Name" }, "age": { "$var": "Age" } },
        "term2": { "name": "bob", "age": 40 },
        "bindings": {}
      }
    ],
    "returns": {
      "Name": {
        "value": "bob",
        "trace": [{ "type": "BIND", "variable": { "$var": "Name" }, "value": "bob" }]
      },
      "Age": {
        "value": 40,
        "trace": [{ "type": "BIND", "variable": { "$var": "Age" }, "value": 40 }]
      }
    }
  },
  {
    "description": "Object Unification: Nested subset matching",
    "params": [
      {
        "term1": { "data": { "value": { "$var": "V" } } },
        "term2": { "id": 123, "data": { "value": "found", "status": "ok" } },
        "bindings": {}
      }
    ],
    "returns": null
  },
  {
    "description": "Custom Unifier: ObjectPattern de-structuring",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "name": { "$var": "Name" }, "age": { "$var": "Age" } }, { "$var": "rest" }]
        },
        "term2": { "name": "alice", "age": 30, "city": "nyc" },
        "bindings": {},
        "location": { "rule": "object-pattern-test" }
      }
    ],
    "returns": {
      "Name": {
        "value": "alice",
        "trace": [{ "type": "BIND", "variable": { "$var": "Name" }, "value": "alice", "location": { "rule": "object-pattern-test" } }]
      },
      "Age": {
        "value": 30,
        "trace": [{ "type": "BIND", "variable": { "$var": "Age" }, "value": 30, "location": { "rule": "object-pattern-test" } }]
      },
      "rest": {
        "value": { "city": "nyc" },
        "trace": [{ "type": "BIND", "variable": { "$var": "rest" }, "value": { "city": "nyc" }, "location": { "rule": "object-pattern-test" } }]
      }
    }
  },
  {
    "description": "Custom Unifier: ObjectPattern failure on missing key",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "name": { "$var": "Name" }, "country": { "$var": "Country" } }]
        },
        "term2": { "name": "alice", "age": 30, "city": "nyc" },
        "bindings": {}
      }
    ],
    "returns": null
  },

  // ==========================================================================
  // 5. Default Values (Value.js)
  // ==========================================================================
  {
    "description": "Default: Plain Object - Symmetric default application",
    "params": [
      {
        "term1": { "a": { "$var": "A" }, "b": { "$optional": [{ "$var": "__B" }, 10] } },
        "term2": { "a": 1 },
        "bindings": {},
        "location": { "rule": "Default-Obj-1" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-Obj-1" } }]
      },
      "__B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 10, "location": { "rule": "Default-Obj-1" } }]
      }
    }
  },
  {
    "description": "Default: Plain Object - Should bind variable to Value object",
    "params": [
      {
        "term1": { "a": { "$var": "A" }, "b": { "$var": "B" } },
        "term2": { "a": 1, "b": { "$optional": [{ "$var": "__B" }, 10] } },
        "bindings": {},
        "location": { "rule": "Default-Obj-3" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-Obj-3" } }]
      },
      "B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "B" }, "value": 10, "location": { "rule": "Default-Obj-3" } }]
      },
      "__B": {
        "value": { "$var": "B" },
        "trace": [{ "type": "BIND", "variable": { "$var": "B" }, "value": { "$var": "__B" }, "location": { "rule": "Default-Obj-3" } }]
      }
    }
  },
  {
    "description": "Default: ObjectPattern - Should bind default for missing key",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "a": { "$var": "A" }, "b": { "$optional": [{ "$var": "__B" }, 10] } }]
        },
        "term2": { "a": 1 },
        "bindings": {},
        "location": { "rule": "Default-ObjPat-1" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-ObjPat-1" } }]
      },
      "__B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 10, "location": { "rule": "Default-ObjPat-1" } }]
      }
    }
  },
  {
    "description": "Default: ObjectPattern - Should ignore default for present key",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "a": { "$var": "A" }, "b": { "$optional": [{ "$var": "__B" }, 10] } }]
        },
        "term2": { "a": 1, "b": 2 },
        "bindings": {},
        "location": { "rule": "Default-ObjPat-2" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-ObjPat-2" } }]
      },
      "__B": {
        "value": 2,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 2, "location": { "rule": "Default-ObjPat-2" } }]
      }
    }
  },
  {
    "description": "Default: ObjectPattern - Should bind default for missing key (with spread)",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "a": { "$var": "A" }, "b": { "$optional": [{ "$var": "__B" }, 10] } }, { "$var": "R" }]
        },
        "term2": { "a": 1, "c": 3 },
        "bindings": {},
        "location": { "rule": "Default-ObjPat-3" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-ObjPat-3" } }]
      },
      "R": {
        "value": { "c": 3 },
        "trace": [{ "type": "BIND", "variable": { "$var": "R" }, "value": { "c": 3 }, "location": { "rule": "Default-ObjPat-3" } }]
      },
      "__B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 10, "location": { "rule": "Default-ObjPat-3" } }]
      }
    }
  },
  {
    "description": "Default: ObjectPattern - Should bind variable to default from value",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": { "$var": "A" }, "b": { "$var": "B" } }] },
        "term2": { "a": 1, "b": { "$optional": [{ "$var": "__B" }, 10] } },
        "bindings": {},
        "location": { "rule": "Default-ObjPat-4" }
      }
    ],
    "returns": {
      "A": {
        "value": 1,
        "trace": [{ "type": "BIND", "variable": { "$var": "A" }, "value": 1, "location": { "rule": "Default-ObjPat-4" } }]
      },
      "B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "B" }, "value": 10, "location": { "rule": "Default-ObjPat-4" } }]
      },
      "__B": {
        "value": { "$var": "B" },
        "trace": [{ "type": "BIND", "variable": { "$var": "B" }, "value": { "$var": "__B" }, "location": { "rule": "Default-ObjPat-4" } }]
      }
    }
  },

  // ==========================================================================
  // 6. Default vs. Symmetric (Pattern vs Pattern)
  // ==========================================================================
  {
    "description": "Default: ObjectPattern - Symmetric, p1 default vs p2 missing",
    "params": [
      {
        "term1": {
          "$objectPattern": [{ "a": 1, "b": { "$optional": [{ "$var": "__B" }, 10] } }]
        },
        "term2": { "$objectPattern": [{ "a": 1 }] },
        "bindings": {},
        "location": { "rule": "Default-Sym-1" }
      }
    ],
    "returns": {
      "__B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 10, "location": { "rule": "Default-Sym-1" } }]
      }
    }
  },
  {
    "description": "Default: ObjectPattern - Symmetric, p1 missing vs p2 default",
    "params": [
      {
        "term1": { "$objectPattern": [{ "a": 1 }] },
        "term2": {
          "$objectPattern": [{ "a": 1, "b": { "$optional": [{ "$var": "__B" }, 10] } }]
        },
        "bindings": {},
        "location": { "rule": "Default-Sym-2" }
      }
    ],
    "returns": {
      "__B": {
        "value": 10,
        "trace": [{ "type": "BIND", "variable": { "$var": "__B" }, "value": 10, "location": { "rule": "Default-Sym-2" } }]
      }
    }
  },

  // ==========================================================================
  // 7. Sleeping Constraints (Value.required)
  // ==========================================================================
  {
    "description": "Unify: Variable vs. Plain Object with Value.required (Sleeping Constraint)",
    "params": [
      {
        "term1": { "$var": "Z" },
        "term2": {
          "$objectPattern": [{ "a": { "$required": [{ "$var": "a" }, 10] } }]
        },
        "bindings": {},
        "location": { "rule": "Sleeping-Constraint-Test" }
      }
    ],
    "returns": {
      "Z": {
        "value": {
          "$objectPattern": [{ "a": { "$required": [{ "$var": "a" }, 10] } }]
        },
        "trace": [
          {
            "type": "BIND",
            "variable": { "$var": "Z" },
            "value": {
              "$objectPattern": [{ "a": { "$required": [{ "$var": "a" }, 10] } }]
            },
            "location": { "rule": "Sleeping-Constraint-Test" }
          }
        ]
      },
      "a": {
        "value": 10,
        "trace": [
          { "type": "BIND", "variable": { "$var": "a" }, "value": 10, "location": { "rule": "Sleeping-Constraint-Test" } }
        ]
      }
    }
  }
]
