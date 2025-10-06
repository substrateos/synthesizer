export const attributes = {
    type: "example/json"
}

export default [
     {
        description: "No imports or exports",
        params: ["const a = 1; let b = 2;"],
        returns: {
            imports: [],
            exports: [],
        }
    },
    {
        description: "Empty input",
        params: [""],
        returns: {
            imports: [],
            exports: [],
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
            imports: [
                { source: 'react', specifiers: [{ type: 'default', localName: 'React' }], attributes: [], span: {start: 13, end: 39} },
                { source: 'react', specifiers: [{ type: 'named', importedName: 'useState', localName: 'useState' }], attributes: [], span: {start: 52, end: 85} }
            ],
            exports: [
                {
                    type: 'named',
                    source: null,
                    specifiers: [{ localName: 'greeting', exportedName: 'greeting', span: {start: 105, end: 129} }],
                    span: {start: 98, end: 130},
                },
                {
                    type: 'default',
                    name: 'App',
                    span: {start: 143, end: 175},
                }
            ],
        }
    },
]
