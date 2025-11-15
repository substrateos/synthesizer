// a test is a function that accepts the inputs {unit} and throws on failure
async function testsFor(workspace, targetNames) {
    // todo unit.testFor might be a promise
    const testUnits = Array.from(workspace.query({filter: ({unit}) => targetNames.has(unit.testFor)}))
    return testUnits.map(({name: testName, unit: testUnit}) => {
        const targetName = testUnit.testFor
        return {testName, targetName}
    })
}

async function getDefault(workspace, name) {
    let unit = await workspace.get(name)
    if (unit && unit[Symbol.toStringTag] === 'Module' && unit.default) {
        unit = unit.default
    }

    return unit
}

async function runTestsFor({path, workspace, names, logResults, throwOnFail}) {
    let passed = [], failed = [], total = 0

    const allTestMatches = await testsFor(workspace, new Set(names))
    for (const [name, matches] of Object.entries(Object.groupBy(allTestMatches, m => m.targetName))) {
        total += matches.length

        try {
            if (logResults) {
                console.group(`TESTS path=${JSON.stringify(path)} testFor=${name}`);
            }
            const unit = await getDefault(workspace, name)

            for (const {testName: test} of matches) {
                try {
                    const testUnit = await getDefault(workspace, test)
                    if (logResults) {
                        console.group(`TEST testUnit=${test}`);
                    }
                    await testUnit({unit, workspace})
                    passed.push({name, test})
                    if (logResults) {
                        console.log(`%cPASS`,
                            'color: #28a745;', // Green
                        );
                    }
                } catch (caught) {
                    failed.push({name, test, caught})
                    if (logResults) {
                        console.error(`%c${caught.name}%c: ${caught.message}`,
                            'color: #dc3545; font-weight: bold;',
                            'color: inherit; font-weight: normal;'
                        );
                    }
                } finally {
                    if (logResults) {
                        console.groupEnd()
                    }
                }
            }
        } finally {
            if (logResults) {
                console.groupEnd()
            }
        }
    }

    if (failed.length && throwOnFail) {
        const failedObj = {}
        for (const {name, test} of failed) {
            if (!(name in failedObj)) {
                failedObj[name] = []
            }
            failedObj[name].push(test)
        }
        const err = new AggregateError(failed.map(({caught}) => caught), `tests failed: ${JSON.stringify(failedObj)}`)
        err.passed = passed
        err.failed = failed
        err.total = total
        throw err
    }

    return {
        passed,
        failed,
        total,
    }
}

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const synths = new Set()
    for (const {path, synth} of workspace.walk()) {
        if (synths.has(synth)) {
            continue
        }
        synths.add(synth)
        await runTestsFor({
            path,
            workspace: synth,
            names: synth.names(),
            logResults: true,
            throwOnFail: false,
        })
    }
}
