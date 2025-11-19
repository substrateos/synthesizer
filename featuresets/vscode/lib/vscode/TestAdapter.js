/**
 * Handles retrieving evaluated modules from the workspace.
 */
async function getDefault(workspace, name) {
    let unit = await workspace.get(name);
    // If it's an ES Module with a default export, unwrap it.
    if (unit && unit[Symbol.toStringTag] === 'Module' && unit.default) {
        unit = unit.default;
    }
    return unit;
}

/**
 * Finds test units based on the 'testFor' property.
 */
function testsFor(workspace, targetNames) {
    // If targetNames is provided, filter by it. Otherwise, find ALL tests.
    const filter = targetNames
        ? ({ unit }) => targetNames.has(unit.testFor)
        : ({ unit }) => !!unit.testFor;

    const testUnits = Array.from(workspace.query({ filter }));

    return testUnits.map(({ name: testName, unit: testUnit }) => {
        const targetName = testUnit.testFor;
        return { testName, targetName };
    });
}

function formatArg(arg) {
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;
    if (arg instanceof Error) return `[Error: ${arg.message}]`;
    try {
        return JSON.stringify(arg, null, 2);
    } catch (e) {
        return String(arg);
    }
}

const ANSI = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    GRAY: '\x1b[90m'
};

/**
 * Translates browser-style %c logs to ANSI-styled strings
 */
function formatBrowserLogs(args) {
    // If the first arg isn't a string or doesn't contain %c, just format normally
    if (typeof args[0] !== 'string' || !args[0].includes('%c')) {
        return args.map(formatArg).join(' ');
    }

    // Split the template string by %c
    // Example: "%c[0] %cTest" -> ["", "[0] ", "Test"]
    const parts = args[0].split('%c');

    // The remaining args are potential styles. 
    // We need to consume one style arg for every %c split (minus the first part)
    const styles = args.slice(1);

    let result = parts[0]; // Text before the first %c
    let styleIndex = 0;

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const style = (styles[styleIndex++] || '').toLowerCase();

        // Basic CSS to ANSI mapping
        let code = ANSI.RESET; // Default to reset to clear previous style

        if (style.includes('bold') || style.includes('font-weight: 700')) {
            code += ANSI.BOLD;
        }

        // Heuristic color matching
        if (style.includes('green') || style.includes('#28a745')) code += ANSI.GREEN;
        else if (style.includes('red') || style.includes('#dc3545')) code += ANSI.RED;
        else if (style.includes('blue') || style.includes('#007bff')) code += ANSI.BLUE;
        else if (style.includes('yellow') || style.includes('orange')) code += ANSI.YELLOW;
        else if (style.includes('gray') || style.includes('color: #999')) code += ANSI.GRAY;

        result += code + part + ANSI.RESET;
    }

    // If there are extra arguments left over (not used by %c), append them
    if (styleIndex < styles.length) {
        result += ' ' + styles.slice(styleIndex).map(formatArg).join(' ');
    }

    return result;
}


export default {
    /**
     * Discovers all tests to populate the VS Code Test Explorer.
     */
    async doDiscover(workspace) {
        // Pass null to discover everything
        const matches = testsFor(workspace, null);

        // Map to the format the Bridge expects for the UI
        return matches.map(m => ({
            testName: m.testName,
            targetName: m.targetName
        }));
    },

    /**
     * Runs specific tests requested by VS Code. Streams events
     * via 'onProgress' instead of console.log.
     */
    async doRun(workspace, requestedTestFiles, onProgress, signal) {
        console.log('doRun', { workspace, requestedTestFiles, onProgress, signal })
        const requestedSet = new Set(requestedTestFiles);

        // Discovery Phase
        // We get all tests, then filter for the ones VS Code asked for.
        const allMatches = testsFor(workspace, null);
        const matchesToRun = allMatches.filter(m => requestedSet.has(m.testName));

        // Grouping Phase (by Target/SUT)
        const grouped = Object.groupBy(matchesToRun, m => m.targetName);

        console.log({ requestedSet, allMatches, matchesToRun, grouped })

        // Execution Phase
        for (const [targetName, matches] of Object.entries(grouped)) {
            if (signal.aborted) return;

            // Notify VS Code we are processing this group (optional output)
            onProgress({
                type: 'test-output',
                testId: matches[0].testName,
                message: `\nPreparing target: ${targetName}...\n`
            });

            try {
                // Load the Subject Under Test (SUT) using your logic
                const unit = await getDefault(workspace, targetName);

                for (const { testName } of matches) {
                    if (signal.aborted) return;
                    const testId = testName;

                    onProgress({ type: 'test-start', testId });
                    const startTime = Date.now();

                    try {
                        // Load the Test Unit
                        const testFn = await getDefault(workspace, testName);

                        let indentLevel = 0;
                        const getIndent = () => '  '.repeat(indentLevel);
                        const sendLog = (args) => {
                            const text = formatBrowserLogs(args);
                            // Indent newlines if it's a multiline string (like a JSON dump)
                            const indentedText = text.split('\n').map(line => getIndent() + line).join('\n');

                            onProgress({
                                type: 'test-output',
                                testId: testName,
                                message: indentedText + '\r\n'
                            });
                        }

                        const console = {
                            log: (...args) => sendLog(args),
                            error: (...args) => sendLog(args),
                            group: (...args) => {
                                if (args.length) sendLog(args);
                                indentLevel++;
                            },
                            groupCollapsed: (...args) => {
                                if (args.length) sendLog(args);
                                indentLevel++;
                            },
                            groupEnd: () => { if (indentLevel > 0) indentLevel--; }
                        }

                        try {
                            // EXECUTE: Inject dependencies exactly as your runner does
                            await testFn({ unit, workspace, console });

                            // resetConsole();
                            onProgress({
                                type: 'test-pass',
                                testId,
                                duration: Date.now() - startTime
                            });
                        } catch (e) {
                            console.error(e)
                            // resetConsole();
                            throw e; // Re-throw to be caught by the outer catch
                        }

                    } catch (caught) {
                        console.error(caught, caught.debug)
                        onProgress({
                            type: 'test-fail',
                            testId,
                            message: caught.message,
                            stack: caught.stack,
                            expected: caught.expected,
                            actual: caught.actual,
                            debug: caught.debug,
                            duration: Date.now() - startTime
                        });
                    }
                }
            } catch (caught) {
                console.error(caught)
                // If the SUT fails to load, fail all associated tests
                const duration = 0;
                for (const { testName } of matches) {
                    const testId = testName;
                    onProgress({
                        type: 'test-fail',
                        testId,
                        message: `Target '${targetName}' failed to load: ${caught.message}`,
                        duration
                    });
                }
            }
        }
    }
}