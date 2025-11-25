export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Logic.trace() returns an array of execution strings",
        params: [
            {
                source: `
                function data(val) {
                    val = 42;
                }

                function test_trace_capture(Log, Val) {
                    // Logic.trace should run 'data(X)', bind X=42,
                    // and bind Log to the chronological trace array.
                    var X;
                    Log = Logic.trace(data(X));
                    Val = X;
                }
                `,
                queries: {
                    "Capture Trace": {
                        "test_trace_capture": [
                            { "$var": "L" },
                            { "$var": "V" }
                        ]
                    }
                }
            }
        ],
        debugKeys: ["generatedSource", "traces"],
        returns: {
            solutions: {
                "Capture Trace": [
                    {
                        "V": 42,
                        "L": [
                            // The tracer captures the subgoal execution.
                            // ID is (2) because (1) is the parent 'test_trace_capture'.
                            // Depth is 1, so 2 spaces of indentation.
                            "  CALL: (2) data(X)",
                            "  EXIT: (2) data(X = 42)"
                        ]
                    }
                ]
            }
        }
    },
    {
        description: "Logic.trace() returns failure (empty list) if goal fails",
        params: [
            {
                source: `
                function fail_goal() {
                    1 === 2;
                }

                function test_trace_fail(Log) {
                    // If the inner goal fails, the Logic.trace goal should fail too.
                    Log = Logic.trace(fail_goal());
                }
                `,
                queries: {
                    "Trace Failure": {
                        "test_trace_fail": [{ "$var": "L" }]
                    }
                }
            }
        ],
        debugKeys: ["generatedSource", "traces"],
        returns: {
            solutions: {
                "Trace Failure": [] 
            }
        }
    }
]