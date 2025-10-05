export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this

    const {count=1, type, typePattern, namePattern} = handlerInputs ?? {}
    let filter
    const mergeFilters = (prev, curr) => prev ? o => (prev(o) && curr(o)) : curr
    if (namePattern) {
        filter = mergeFilters(filter, ({name}) => namePattern.test(name))
    }
    if (type) {
        filter = mergeFilters(filter, entry => type === entry.unit.type)
    }
    if (typePattern) {
        filter = mergeFilters(filter, entry => typePattern.test(entry.unit.type))
    }

    // todo use a seed, a better prng, and a better shuffling algorithm
    let units = workspace.query({filter});
    units = units.sort(() => Math.random() - 0.5).slice(0, count);
    return units
}
