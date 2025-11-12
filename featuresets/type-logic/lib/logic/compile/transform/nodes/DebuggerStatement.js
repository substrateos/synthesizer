export default function transformDebuggerStatement(stmt, context) {
    return [
        'debugger;',
        'pc++;',
        '// fallthrough'
    ]
}
