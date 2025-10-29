export default function transformDebuggerStatement(stmt, context) {
    return {
        type: 'debugger',
        op: stmt,
    }
}
