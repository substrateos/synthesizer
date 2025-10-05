import unitOf from '@workspace/lib/synth/unitOf'

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

    const formatCase = ({description, params, returns, throws, debug}, i) => {
        return `
    // description=${JSON.stringify(description)}
    ${debug ? '' : '// ' }debugger
    let gotReturns${i}, gotThrows${i}
    try {
        gotReturns${i} = await unit(${params.map(p => JSON.stringify(p)).join(", ")});
    } catch (err) {
        gotThrows${i} = {name: err.name, message: err.message, ...err}
    }
    const wantThrows${i} = ${JSON.stringify(throws)}
    if (JSON.stringify(wantThrows${i}) !== JSON.stringify(gotThrows${i})) {
        const failure = "FAIL testID=${name} description="+${JSON.stringify(description)}+" gotThrows${i} = "+JSON.stringify(gotThrows${i});
        console.log(failure)
        throw new Error(failure);
    }

    const wantReturns${i} = ${JSON.stringify(returns)};
    if (JSON.stringify(wantReturns${i}) !== JSON.stringify(gotReturns${i})) {
        const failure = "FAIL testID=${name} description="+${JSON.stringify(description)}+" gotReturns${i} = "+JSON.stringify(gotReturns${i});
        console.log(failure)
        throw new Error(failure);
    }
`
        }

        return await workspace.call(unitOf.javascript `
async ({unit}) => {
    // testID=${name}
${cases.map((testCase, i) => formatCase(testCase, i)).join("\n")}
}`)
}
