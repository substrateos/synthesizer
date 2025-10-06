export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Named export of a constant",
        params: ["export const myVar = 123;"],
        returns: {
            imports: [],
            exports: [{
                type: 'named',
                source: null,
                specifiers: [{ localName: 'myVar', exportedName: 'myVar', span: {start: 7, end: 24} }],
                span: {start: 0, end: 25},
            }],
        }
    },
    {
        description: "Default export of a function",
        params: ["export default function myFunc() {}"],
        returns: {
            imports: [],
            exports: [{ type: 'default', name: 'myFunc', span: {start: 0, end: 35} }],
        }
    },
    {
        description: "Default export from an import",
        params: ["export {default} from 'foo'"],
        returns: {
            imports: [{ source: 'foo', specifiers: [{ type: 'default'}], attributes: [], span: {start: 0, end: 27} }],
            exports: [{"type":"named","source":"foo","specifiers":[{"localName":"default","exportedName":"default"}],"span":{"start":0,"end":27}}],
        }
    },
    {
        description: "Export from an import with an alias",
        params: ["export {default as 'bar', baz} from 'foo'"],
        returns: {
            imports: [{"source":"foo","specifiers":[{"type":"default"},{"type":"named","importedName":"baz"}],"attributes":[],"span":{"start":0,"end":41}}],
            exports: [{"type":"named","source":"foo","specifiers":[{"localName":"default"},{"localName":"baz","exportedName":"baz"}],"span":{"start":0,"end":41}}],
        }
    },
    {
        description: "Export namespace an import",
        params: ["export * from 'foo'"],
        returns: {
            imports: [{"source":"foo","specifiers":[],"attributes":[],"span":{"start":0,"end":19}}],
            exports: [{"type":"all","source":"foo","span":{"start":0,"end":19}}],
        }
    },
]
