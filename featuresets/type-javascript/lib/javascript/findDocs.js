// todo should return docs for exports if a module and the last top-level return statement or expression if not

export default function findDocs({ast, comments}) {
    // 1. Prioritize finding the last top-level return statement.
    let targetNode = ast.body.findLast(node => node.type === 'ReturnStatement');

    // 2. Fallback: If no return is found, find the last top-level expression.
    if (!targetNode) {
        targetNode = ast.body.findLast(node => node.type === 'ExpressionStatement');
    }

    // If neither was found, exit.
    if (!targetNode) {
        return null;
    }

    // 3. Find the comment immediately preceding the target node.
    const precedingComments = comments.filter(c => c.end < targetNode.start);
    if (precedingComments.length > 0) {
        const lastComment = precedingComments[precedingComments.length - 1];

        const isCloselyAssociated =
            targetNode.loc.start.line - lastComment.loc.end.line <= 2;

        if (isCloselyAssociated) {
            // 4. Return the comment's original syntax and parsed text.
            // parsed: lastComment.value.trim(),
            return source.slice(lastComment.start, lastComment.end)
        }
    }
}
