export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {source} = unit

    let parsed
    let cases
    if (typeof source === 'string') {
        parsed = JSON.parse(source)
    } else {
        parsed = source
    }
    if (Array.isArray(parsed)) {
        cases = parsed
    } else {
        cases = [parsed]
    }

    const expectedResults = cases.map(({returns, throws}) => ({
        returns,
        throws
    }));

    const formatCase = ({description, params, debug}, i) => {
        return `
    // Case ${i}: ${JSON.stringify(description)}
    ${debug ? '' : '// ' }debugger
    try {
        const returns = await unit(${params.map(p => JSON.stringify(p)).join(", ")});
        actualResults.push({ returns });
    } catch (err) {
        const throws = {name: err.name, message: err.message, ...err};
        actualResults.push({ throws });
    }
`
    }

    const testSource = `
import {jsondiffpatch} from "@/lib/example/json/jsondiffpatch@0.7.3/jsondiffpatch.js";
import ConsoleFormatter from "@/lib/example/json/ConsoleFormatter.js";

export default async ({unit}) => {
    // testID=${name}
    
    // Embed the test cases and expected results directly in the source.
    const cases = ${JSON.stringify(cases, null, 2)};
    const expectedResults = ${JSON.stringify(expectedResults, null, 2)};
    const actualResults = [];
    const differ = jsondiffpatch.create();

    ${cases.map((testCase, i) => formatCase(testCase, i)).join("\n")}

    // Helper to remove debug-only keys for a clean comparison.
    const cleanResultForDiff = (result, testCase) => {
        // Deep clone to avoid modifying the original object.
        const cleanedResult = JSON.parse(JSON.stringify(result));
        if (testCase.debugKeys && result.returns) {
            for (const key of testCase.debugKeys) {
                delete cleanedResult.returns[key];
            }
        }
        return cleanedResult;
    };

    const debugResult = (result, testCase) => {
        if (!testCase.debugKeys || !result.returns) {
            return null; // No debugKeys for this case.
        }
        const d = {};
        for (const key of testCase.debugKeys) {
            d[key] = result.returns[key];
        }
        return d;
    };

    // Create clean versions of the results for comparison.
    const expectedForDiff = expectedResults.map((res, i) => cleanResultForDiff(res, cases[i]));
    const actualForDiff = actualResults.map((res, i) => cleanResultForDiff(res, cases[i]));
    
    // Perform the diff against the cleaned result sets.
    const delta = differ.diff(expectedForDiff, actualForDiff);
    const actualForDebug = actualResults.map((res, i) => debugResult(res, cases[i]));
    const formatter = new ConsoleFormatter();

    /**
     * Logs a single test case result (PASS or FAIL) to the console.
     */
    const logTestCase = (i, testCase, testDelta, expected, actual, debug) => {
        if (testDelta) {
            // This test FAILED
            console.group(
                \`%c[\${i}] %c\${testCase.description}\`,
                'color: #dc3545; font-weight: bold;', // Style for [FAIL @ index]
                'color: inherit; font-weight: normal;' // Style for description
            );
            try {
                // Use ConsoleFormatter to show the diff
                formatter.format(testDelta);
            } catch (e) {
                console.error("Error while formatting delta", testDelta, e)
            }
        } else {
            // This test PASSED
            console.groupCollapsed(
                \`%c[\${i}] %c\${testCase.description}\`,
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


    let error
    if (delta) {
        const hasDebug = actualForDebug.some(d => d)
        const failure = [
            "FAIL testID=${name}",
            " want=" + JSON.stringify(expectedForDiff),
            "  got=" + JSON.stringify(actualForDiff),
            ...(hasDebug ? ["debug=" + JSON.stringify(actualForDebug)] : []),
        ].join("\\n")
        error = new Error(failure);
    }

    // Iterate through all test cases and use the new helper
    for (let i = 0; i < cases.length; i++) {
        logTestCase(
            i,
            cases[i],
            (delta && (delta[\`\${i}\`] || delta[\`_\${i}\`])),
            expectedForDiff[i],
            actualForDiff[i],
            actualForDebug[i]
        );
    }

    if (error) {
        throw error
    }
}`

    return await workspace.call({
        type: 'javascript', 
        source: testSource
    });
}