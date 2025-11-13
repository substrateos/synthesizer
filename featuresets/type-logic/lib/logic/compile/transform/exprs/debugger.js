export default function(stmt, context) {
    return [
        'debugger;',
        'pc++;',
        '// fallthrough'
    ]
}
