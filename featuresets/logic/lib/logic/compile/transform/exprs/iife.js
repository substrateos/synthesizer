export default (startExpr, bodyExprs, endExpr) => e => {
    e.emit(
        `${startExpr ? e.child(startExpr, false) : '(() =>'} {`,
        e.children(bodyExprs),
        `})(${endExpr ? e.child(endExpr, false) : ''});`
    )
}
