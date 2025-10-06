export const attributes = {
    do: {get: 'do/get/javascript'}
}

/**
 * Analyzes the code and converts the last expression (if any) to a 'return' statement.
 *
 * @param {string} code The code to parse.
 * @returns {string} The code with an explicit return statement for the last expression.
 */
export default function insertReturn({source, ast}) {
    if (!ast.body || ast.body.length === 0) {
        return source;
    }

    const lastStatement = ast.body[ast.body.length - 1];

    // The only time we want to add a `return` is if the last statement
    // is an ExpressionStatement. This covers things like `1+1`, `"hello"`,
    // `myFunction()`, but not `let x = 5`, `if(...)`, or `return y`.
    if (lastStatement.type !== 'ExpressionStatement') {
        // In all other cases (e.g., the last statement is already a return,
        // a variable declaration, an if-block, etc.), return the original source.
        return source
    }

    const expression = lastStatement.expression;

    // Slice the original source to get everything before and after the last expression.
    const prefix = source.slice(0, expression.start);
    const suffix = source.slice(expression.start, expression.end);

    // Reconstruct the source with the 'return' keyword injected.
    return `${prefix}return ${suffix}`;
}
