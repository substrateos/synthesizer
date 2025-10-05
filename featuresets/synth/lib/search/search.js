/**
 * Searches a specified attribute of units for a pattern, returning all matches.
 * @function
 * @param {object} options - The search options.
 * @param {RegExp} options.pattern - The regular expression to match against.
 * @param {Array<{unit: object, name: string}>} options.units - The list of named units to search through.
 * @param {string} options.attribute - The name of the attribute within each unit to search.
 * @returns {Array<{match: string, unit: object, name: string, attribute: string, index: number, groups: object|null, captures: Array<string>}>} - A list of all matches found.
 */
export default function search({ pattern, units, attribute }) {
    const results = [];
    if (!pattern || !units || !attribute) {
        return results;
    }
    if (typeof pattern === 'string') {
        pattern = new RegExp(pattern, 'g')
    }

    for (const { unit, name } of units) {
        // Ensure the unit and the target attribute exist and the attribute is a string
        if (unit && typeof unit[attribute] === 'string') {
            // A global flag is required for matchAll. This creates a new RegExp with the 'g' flag if it's not already present.
            const globalPattern = new RegExp(pattern.source, pattern.flags?.includes('g') ? pattern.flags : pattern.flags + 'g');
            const allMatches = unit[attribute].matchAll(globalPattern);

            for (const matchResult of allMatches) {
                results.push({
                    match: matchResult[0],
                    unit,
                    name,
                    attribute,
                    index: matchResult.index,
                    groups: matchResult.groups || null,
                    captures: matchResult.slice(1),
                });
            }
        }
    }
    return results;
}
