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

    const expectedResults = cases.map(({description, returns, throws}) => ({
        description,
        returns,
        throws
    }));

    const formatCase = ({description, params, debug}, i) => {
        return `
    // Case ${i}: ${JSON.stringify(description)}
    ${debug ? '' : '// ' }debugger
    try {
        const returns = await unit(${params.map(p => JSON.stringify(p)).join(", ")});
        actualResults.push({ description: ${JSON.stringify(description)}, returns });
    } catch (err) {
        const throws = {name: err.name, message: err.message, ...err};
        actualResults.push({ description: ${JSON.stringify(description)}, throws });
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
        if (!testCase.debugKeys || !result.returns) {
            return result; // No cleaning needed for this case.
        }
        // Deep clone to avoid modifying the original object.
        const cleanedResult = JSON.parse(JSON.stringify(result));
        for (const key of testCase.debugKeys) {
            delete cleanedResult.returns[key];
        }
        return cleanedResult;
    };

    // Create clean versions of the results for comparison.
    const expectedForDiff = expectedResults.map((res, i) => cleanResultForDiff(res, cases[i]));
    const actualForDiff = actualResults.map((res, i) => cleanResultForDiff(res, cases[i]));
    
    // Perform the diff against the cleaned result sets.
    const delta = differ.diff(expectedForDiff, actualForDiff);

    // If there's a difference, log the full, original results and throw an error.
    if (delta) {
        const failure = [
            "FAIL testID=${name}",
            "want=" + JSON.stringify(expectedResults), // Log original full data
            " got=" + JSON.stringify(actualResults),   // Log original full data
        ].join("\\n")
        console.log('FAIL: Test results for "${name}" do not match expected results.', {
            expectedResults, // Log original
            actualResults    // Log original
        });
        try {
            new ConsoleFormatter().format(delta);
        } catch (e) {
            console.error("Error while formatting delta", delta, e)
        }
        throw new Error(failure);
    }
}`

    return await workspace.call({
        type: 'javascript', 
        source: testSource
    });
}
