export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Simple Default Import",
        params: ["import myDefault from 'my-module';"],
        returns: {
            imports: [{ source: 'my-module', specifiers: [{ type: 'default', localName: 'myDefault' }], attributes: [], span: {start: 0, end: 34} }],
            exports: [],
        },
    },
    {
        description: "Simple Dynamic Import",
        params: ["() => import('foo');"],
        returns: {
            imports: [{ dynamic: true, source: 'foo', specifiers: [], attributes: [], span: {start: 6, end: 19} }],
            exports: [],
        },
    },
    {
        description: "Import with attributes",
        params: ["import data from './data.json' with { type: 'json' };"],
        returns: {
            imports: [{ source: './data.json', specifiers: [{ type: 'default', localName: 'data' }], attributes: [{key: 'type', value: 'json'}], span: {start: 0, end: 53} }],
            exports: [],
        }
    },
    {
        description: "Invalid syntax should throw error",
        params: ["import { myVar from 'my-module';"], // Invalid syntax
        throws: {"name":"SyntaxError","message":"Unexpected token (1:15)","pos":15,"loc":{"line":1,"column":15},"raisedAt":19}
    },
]
