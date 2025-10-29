export default function positionTracker(text) {
    // Pre-calculate and store the starting offset of each line.
    const lineStartOffsets = [0]; // The first line always starts at offset 0
    let currentOffset = -1;
    while ((currentOffset = text.indexOf('\n', currentOffset + 1)) !== -1) {
        lineStartOffsets.push(currentOffset + 1);
    }

    // Return a closure that performs a fast lookup for both line and column.
    return function getLineAndColumn(offset) {
        // Use a binary search to find the correct line index.
        let low = 0;
        let high = lineStartOffsets.length - 1;
        let lineIndex = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (lineStartOffsets[mid] <= offset) {
                lineIndex = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // The line number is the 1-indexed line index.
        const lineNumber = lineIndex + 1;

        // The starting offset of the found line.
        const lineOffset = lineStartOffsets[lineIndex];

        // The column number is the difference between the target offset and the line's starting offset.
        const columnNumber = offset - lineOffset;

        return { line: lineNumber, column: columnNumber };
    };
}