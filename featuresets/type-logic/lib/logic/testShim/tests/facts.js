export const attributes = {
  type: "example/json"
}

export default [{
  description: "Basic tests for a facts-only program",
  params: [{
    source: `
      // A simple database of facts.
      function color(t='sky', c='blue') {}
      function color(t='grass', c='green') {}
      function color(t='rose', c='red') {}
    `,
    queries: {
      "Should find the color of a known thing": {
        color: ['sky', { "$var": "C" }]
      },
      "Should find what thing has a known color": {
        color: [{ "$var": "T" }, 'red']
      },
      "Should find all color pairs": {
        color: [{ "$var": "Thing" }, { "$var": "Color" }]
      },
      "Should succeed for a known fact": {
        color: ['grass', 'green']
      },
      "Should fail for an unknown fact": {
        color: ['sky', 'red']
      }
    }
  }],
  debugKeys: ["generatedSource", "traces"],
  returns: {
    "solutions": {
      "Should find the color of a known thing": [
        {
          "C": "blue",
        }
      ],
      "Should find what thing has a known color": [
        {
          "T": "rose",
        }
      ],
      "Should find all color pairs": [
        {
          "Thing": "sky",
          "Color": "blue",
        },
        {
          "Thing": "grass",
          "Color": "green",
        },
        {
          "Thing": "rose",
          "Color": "red",
        }
      ],
      "Should succeed for a known fact": [
        {}
      ],
      "Should fail for an unknown fact": []
    },
  }
}]