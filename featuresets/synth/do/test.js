// a test is a function that accepts the inputs {unit} and throws on failure
async function testsFor(workspace, targetNames) {
    // todo unit.testFor might be a promise
    const testUnits = workspace.query({filter: ({unit}) => targetNames.has(unit.testFor)})
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

async function runTestsFor({workspace, names, logResults, throwOnFail}) {
    let passed = [], failed = [], total = 0

    const allTestMatches = await testsFor(workspace, new Set(names))
    for (const [name, matches] of Object.entries(Object.groupBy(allTestMatches, m => m.targetName))) {
        total += matches.length

        const unit = await getDefault(workspace, name)

        for (const {testName: test} of matches) {
            try {
                const testUnit = await getDefault(workspace, test)
                await testUnit({unit, workspace})
                passed.push({name, test})
                if (logResults) {
                    console.log(`PASS testFor=${name} testUnit=${test}`);
                }
            } catch (caught) {
                failed.push({name, test, caught})
                if (logResults) {
                    console.error(`FAIL testFor=${name} testUnit=${test} error="${caught.name}: ${caught.message}`);
                }
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
    return await runTestsFor({
        workspace,
        names: workspace.names(),
        logResults: true,
        throwOnFail: false,
    })
}
