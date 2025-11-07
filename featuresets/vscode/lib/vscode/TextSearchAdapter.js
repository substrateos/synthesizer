// Helper function to build a safe regex
function buildRegex(query) {
    const flags = query.isCaseSensitive ? 'g' : 'gi';
    let pattern = query.pattern;

    if (!query.isRegExp) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    if (query.isWordMatch) {
        pattern = `\\b${pattern}\\b`;
    }
    return new RegExp(pattern, flags);
}

// Helper function to split text into lines
function getLines(text) {
    return text.split(/\r?\n/);
}

export default {
    /**
     * Performs a text search across all units.
     * Streams matches via the onProgress callback.
     */
    async doTextSearch(synth, query, options, onProgress, signal) {
        const regex = buildRegex(query);

        for (const { name, unit } of synth.query()) {
            if (signal?.aborted) {
                throw new Error('AbortError');
            }
            if (name === '.vscode/settings.json') {
                continue;
            }

            const content = unit.source || "";
            const lines = getLines(content);

            for (let i = 0; i < lines.length; i++) {
                const lineText = lines[i] || "";
                const matches = [];
                let match;

                while ((match = regex.exec(lineText)) !== null) {
                    matches.push([match.index, match[0].length]);
                }

                if (matches.length > 0) {
                    // Send the richer TextSearchMatch2-style payload
                    onProgress({
                        uriPath: `/${name}`,
                        previewText: lineText,
                        ranges: matches.map(([start, length]) => ({
                            previewRange: { // The range *relative to the previewText*
                                start: { line: 0, character: start },
                                end: { line: 0, character: start + length }
                            },
                            sourceRange: { // The range *in the full document*
                                start: { line: i, character: start }, // 'i' is the line number
                                end: { line: i, character: start + length }
                            }
                        }))
                    });
                }
            }
        }
    }
}
