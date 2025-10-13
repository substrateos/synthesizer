export const attributes = {
  type: "example/json"
}

export default [
  {
    "description": "Family Tree Logic Tests",
    "params": [
      {
        "source": `
// Facts
function parent(g='ann', c='bob') {}
function parent(g='bob', c='carl') {}
function parent(g='dave', c='emily') {}

// Rule
function grandparent(G, C) {
  var P
  parent(G, P)
  parent(P, C)
}
        `,
        "queries": {
          "Should find the parent of a known child": {
            "parent": [
              {
                "$var": "P"
              },
              "carl"
            ]
          },
          "Should find the child of a known parent": {
            "parent": [
              "ann",
              {
                "$var": "C"
              }
            ]
          },
          "Should find all parent-child pairs": {
            "parent": [
              {
                "$var": "P"
              },
              {
                "$var": "C"
              }
            ]
          },
          "Should find a specific grandparent": {
            "grandparent": [
              "ann",
              {
                "$var": "GC"
              }
            ]
          }
        }
      }
    ],
    "debugKeys": ["generatedSource", "predicates", "traces"],
    "returns": {
      "solutions": {
        "Should find the parent of a known child": [
          {
            "P": "bob"
          }
        ],
        "Should find the child of a known parent": [
          {
            "C": "bob"
          }
        ],
        "Should find all parent-child pairs": [
          {
            "P": "ann",
            "C": "bob"
          },
          {
            "P": "bob",
            "C": "carl"
          },
          {
            "P": "dave",
            "C": "emily"
          }
        ],
        "Should find a specific grandparent": [
          {
            "GC": "carl"
          }
        ]
      },
    }
  }
]