export const attributes = {
    type: "example/json"
}

export default [
    {
        "description": "Logic.config(): check async flag in solve (false)",
        "params": [{
            "source": `
                function check_async(IsAsync) {
                    var Config;
                    Config = Logic.config();
                    ({async: IsAsync, ..._} = Config);
                }
            `,
            "queries": {
                "Check Async Flag": {
                    "check_async": [{ "$var": "R" }]
                }
            },
            "async": false
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Check Async Flag": [{ "R": false }]
            }
        }
    },
    {
        "description": "Logic.config(): check async flag in solveAsync (true)",
        "params": [{
            "source": `
                function check_async(IsAsync) {
                    var Config;
                    Config = Logic.config();
                    ({async: IsAsync, ..._} = Config);
                }
            `,
            "queries": {
                "Check Async Flag": {
                    "check_async": [{ "$var": "R" }]
                }
            },
            "async": true
        }],
        "debugKeys": ["generatedSource", "traces"],
        "returns": {
            "solutions": {
                "Check Async Flag": [{ "R": true }]
            }
        }
    },
]
