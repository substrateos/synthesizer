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
  }
]
