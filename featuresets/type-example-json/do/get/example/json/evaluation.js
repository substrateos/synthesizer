import stringify from '@/lib/example/json/stringify.js'

export default async function (handlerInputs) {
    const { action, unit, name, workspace, console } = this

    // ensure we get a fresh instance each time, so tests cannot interfere with each other
    const { default: parsed } = await workspace.getAttribute({ name, unit, attribute: 'javascript:evaluation', cached: false })
    const cases = Array.isArray(parsed) ? parsed : [parsed]

    const expecteds = cases.map(({ returns, throws }) => (Object.assign({}, (returns !== undefined) && { returns }, (throws !== undefined) && { throws })));
    return async ({ unit, console }) => {

        // Embed the test cases and expected results directly in the source.
        const actuals = []
        const debugs = []

        for (const { description, debug, debugKeys, params, method } of cases) {
            const stripDebug = (returns) => {
                if (!debugKeys || !returns) {
                    return null;
                }
                const d = {};
                for (const key of debugKeys) {
                    d[key] = returns[key];
                    delete returns[key];
                }
                return d;
            };

            if (debug) {
                debugger;
            }
            try {
                const returns = await (method ? unit[method](...params) : unit(...params));
                debugs.push(stripDebug(returns));
                actuals.push({ returns });
            } catch (err) {
                if (err.name === 'RangeError' && err.message === 'Maximum call stack size exceeded') {
                    console.error(err);
                }
                const throws = { name: err.name, message: err.message, ...err };
                debugs.push(null);
                actuals.push({ throws });
            }
        }

        const deltas = expecteds.map((expected, i) => stringify(expected) !== stringify(actuals[i]))
        const failedIndexes = deltas.flatMap((d, i) => d ? [i] : [])

        let error
        if (failedIndexes.length > 0) {
            const hasDebug = debugs.some(d => d)
            const failure = [
                `FAIL testID=${name}`,
                ` failedIndexes=${stringify(failedIndexes)}`,
                ` want=${stringify(expecteds)}`,
                `  got=${stringify(actuals)}`,
                ...(hasDebug ? [`debug=${stringify(debugs)}`] : []),
            ].join("\n")
            error = new Error(failure);
            error.expected = expecteds
            error.actual = actuals
            error.debug = debugs
        }

        /**
         * Logs a single test case result (PASS or FAIL) to the console.
         */
        const logTestCase = (i, failed, testCase, expected, actual, debug) => {
            if (failed) {
                // This test FAILED
                console.group(
                    `%c[${i}] %c${testCase.description}`,
                    'color: #dc3545; font-weight: bold;', // Style for [FAIL @ index]
                    'color: inherit; font-weight: normal;' // Style for description
                );
            } else {
                // This test PASSED
                console.groupCollapsed(
                    `%c[${i}] %c${testCase.description}`,
                    'color: #28a745;', // Green
                    'color: inherit; font-weight: normal;'
                );
            }
            console.log('Params:', testCase.params);
            console.log('Result:', actual); // Show 'Got'
            console.log('Expect:', expected); // Show 'Expected'
            if (debug) {
                console.log('Debug: ', debug);
            }
            console.groupEnd();
        };

        // Iterate through all test cases and use the new helper
        for (let i = 0; i < cases.length; i++) {
            logTestCase(
                i,
                deltas[i],
                cases[i],
                expecteds[i],
                actuals[i],
                debugs[i]
            );
        }

        if (error) {
            throw error
        }
    }
}
