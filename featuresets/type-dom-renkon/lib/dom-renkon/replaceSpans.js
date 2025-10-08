/**
 * Replaces specified spans in a string with their own unique replacement strings.
 * Note: This function expects spans to be non-overlapping. Overlapping spans may
 * produce unexpected results. Spans are processed in order of their start index.
 *
 * @param {string} text - The original string.
 * @param {Array<{start: number, end: number, replacement: string}>} spans
 * An array of span objects, each with its own replacement string.
 * @returns {string} The new string with the spans replaced.
 */
export default function replaceSpans(text, spans) {
    if (!spans || spans.length === 0) {
        return text;
    }

    // 1. Sort spans by start index to ensure correct order of operations.
    const sortedSpans = [...spans].sort((a, b) => a.start - b.start);

    // 2. Build the new string by iterating through the sorted spans.
    const result = [];
    let lastIndex = 0;

    for (const span of sortedSpans) {
        // Add the segment of the original string before the current span.
        result.push(text.substring(lastIndex, span.start));

        // Add the span's unique replacement.
        result.push(span.replacement);

        // Update our position to the end of the current span.
        lastIndex = span.end;
    }

    // 3. Add the final segment of the string that comes after the last span.
    result.push(text.substring(lastIndex));

    return result.join('');
}
