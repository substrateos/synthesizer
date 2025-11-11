export default (startExpr, ...bodyExprs) => e => {
    e.emit(
        `${startExpr ? e.child(startExpr, false) : ''}{`,
        e.children(bodyExprs),
        '}',
    )
}
