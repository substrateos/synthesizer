export default function mangleImport(localName) {
    return `$i_${localName}`;
}
