export const attributes = {
    type: "example/json"
}

export default [
    {
        description: "Simple",
        params: ["foo"],
        returns: {
            freeVariables: ["foo"],
        }
    },
    {
        description: "for let",
        params: [`
for (let i = 0; i < 10; i++) {}
`],
        returns: {
            freeVariables: [],
        }
    },
    {
        description: "try catch",
        params: [`
try {
    1 + 1
} catch (err) {
   console.log(err)
}
`],
        returns: {
            freeVariables: [],
        }
    },
    {
        description: "class",
        params: [`
class A {};
new A();
`],
        returns: {
            freeVariables: [],
        }
    },
    {
        description: "typeof",
        params: [`
typeof foo === 'undefined';
typeof bar === 'object';
console.log(bar)
`],
        returns: {
            freeVariables: ["bar"],
        }
    },
    {
        description: "switch",
        params: [`
switch (true) {
default:
    const foo = 'x';
    console.log(foo);
}
`],
        returns: {
            freeVariables: [],
        }
    },
]
