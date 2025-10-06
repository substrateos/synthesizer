export const attributes = {
    type: "example/json"
}

export default [
     {
        description: "No imports or exports",
        params: ["const a = 1; let b = 2;"],
        returns: {
            staticExports: {consts: {}},
        }
    },
    {
        description: "Empty input",
        params: [""],
        returns: {
            staticExports: {consts: {}},
        }
    },
    {
        description: "Combination of imports and exports",
        params: [`
            import React from 'react';
            import { useState } from 'react';
            export const greeting = 'hello';
            export default function App() {}
        `],
        returns: {
            staticExports: {consts: {greeting: "hello"}},
        }
    },
]
