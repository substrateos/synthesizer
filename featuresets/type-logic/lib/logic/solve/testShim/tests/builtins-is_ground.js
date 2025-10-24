export const attributes = {
  type: "example/json"
}

export default [{
  "description": "Test Logic.is_ground/1",
  "params": [{
    "source": `
        function check_ground(Term) {
          Logic.is_ground(Term);
        }
      `,
    "queries": {
      "Ground_Atom": { "check_ground": ["hello"] },
      "Ground_Number": { "check_ground": [123] },
      "Ground_Bool": { "check_ground": [true] },
      "Ground_Empty_List": { "check_ground": [[]] },
      "Ground_List": { "check_ground": [[1, "a"]] },
      "Ground_Empty_Obj": { "check_ground": [{}] },
      "Ground_Obj": { "check_ground": [{ "a": 1, "b": [2] }] },
      "Fail_Ground_Var": { "check_ground": [{ "$var": "X" }] },
      "Fail_Ground_List": { "check_ground": [[{ "$var": "Y" }]] },
      "Fail_Ground_Obj": { "check_ground": [{ "a": { "$var": "Z" } }] }
    }
  }],
  "debugKeys": [
    "generatedSource",
    "predicates",
    "traces"
  ],
  "returns": {
    "solutions": {
      // Should succeed once (empty solution) if ground, fail (empty list) otherwise
      "Ground_Atom": [{}],
      "Ground_Number": [{}],
      "Ground_Bool": [{}],
      "Ground_Empty_List": [{}],
      "Ground_List": [{}],
      "Ground_Empty_Obj": [{}],
      "Ground_Obj": [{}],
      "Fail_Ground_Var": [],
      "Fail_Ground_List": [],
      "Fail_Ground_Obj": [],
    }
  },
},
]