export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Named export of a constant",
        params: ["export const myVar = 123;"],
        returns: {
            defaultExports: [],
        }
    },
    {
        description: "Default export of a function",
        params: ["export default function myFunc() {}"],
        returns: {
            defaultExports: [{ type: 'default', name: 'myFunc', span: {start: 0, end: 35} }],
        }
    },
    {
        description: "Default export of an existing value",
        params: ["function myFunc() {}\nexport default myFunc"],
        returns: {
            defaultExports: [{ type: 'default', name: 'myFunc', span: {start: 21, end: 42} }],
        }
    },
    {
        description: "Default export from an import",
        params: ["export {default} from 'foo'"],
        returns: {
            defaultExports: [],
        }
    },
    {
        description: "Export from an import with an alias",
        params: ["export {default as 'bar', baz} from 'foo'"],
        returns: {
            defaultExports: [],
        }
    },
    {
        description: "Export namespace an import",
        params: ["export * from 'foo'"],
        returns: {
            defaultExports: [],
        }
    },
]
