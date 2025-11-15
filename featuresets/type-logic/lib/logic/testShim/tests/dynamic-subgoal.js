export const attributes = {
    type: "example/json"
}

export default [{
    "description": "Dynamic Goal for a Generic Map Predicate",
    "params": [{
        "source": `
        // --- Transformation Predicates ---
        // These are the specific operations we want to apply to a list.
        function increment(N, Result) {
            Result = Number(N + 1);
        }

        function square(N, Result) {
            Result = Number(N * N);
        }

        // --- The Generic map/3 Predicate ---
        // This is the core higher-order logic we want to test.
        function map(input=[], output=[], p=_) {}

        function map([H_in, ...T_in], [H_out, ...T_out], P) {
            P(H_in, H_out);
            map(T_in, T_out, P);
        }

        // --- Test Shim Entry Point ---
        // This section makes the test compatible with the shim's limitations.

        // 1. Map operation names (strings) to the actual predicates.
        function op(name='increment', pred=increment) {}
        function op(name='square', pred=square) {}

        // 2. Create an entry-point rule for the test to call.
        function map_list(ListIn, ListOut, OpName) {
            var P;
            // Look up the predicate reference from its string name.
            op(OpName, P);
            // Call the generic map predicate with the resolved predicate.
            map(ListIn, ListOut, P);
        }
                `,
        "queries": {
            "Map increment over a list": {
                "map_list": [[10, 20, 30], { "$var": "Result" }, "increment"]
            },
            "Map square over a list": {
                "map_list": [[2, 4, 6], { "$var": "Result" }, "square"]
            },
            "Map over an empty list": {
                "map_list": [[], { "$var": "Result" }, "increment"]
            },
        }
    }],
    "debugKeys": ["generatedSource", "traces"],
    "returns": {
        "solutions": {
            "Map increment over a list": [{ "Result": [11, 21, 31] }],
            "Map square over a list": [{ "Result": [4, 16, 36] }],
            "Map over an empty list": [{ "Result": [] }],
        }
    }
}]