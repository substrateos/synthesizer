async function allAsync(solutionGenerator) {
    const solutions = []
    for await (const solution of solutionGenerator) {
        solutions.push(solution)
    }
    return solutions
}

export default function all(solutionGenerator) {
    if (Symbol.asyncIterator in solutionGenerator) {
        return allAsync(solutionGenerator)
    }

    return [...solutionGenerator]
}
