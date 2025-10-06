export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Named export of a constant",
        params: ["export const myVar = 123;"],
        returns: {
            staticExports: {consts: {myVar: 123}},
        }
    },
    {
        description: "Default export of a function",
        params: ["export default function myFunc() {}"],
        returns: {
            staticExports: {consts: {}},
        }
    },
]
