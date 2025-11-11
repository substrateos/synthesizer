export default (conditionExpr, thenExpr, elseExpr) => e => {
    e.emit(
        `if (${e.child(conditionExpr, false)}) {`,
        e.child(thenExpr),
        ...(
            elseExpr
                ? [
                    '} else {',
                    e.child(elseExpr),
                ]
                : []
        ),
        '}',
    )
}