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
            staticExports: {consts: {myVar: 123}},
        }
    },
    {
        description: "Default export of a function",
        params: ["export default function myFunc() {}"],
        returns: {
            imports: [],
            exports: [{ type: 'default', name: 'myFunc', span: {start: 0, end: 35} }],
            staticExports: {consts: {}},
        }
    },
]
