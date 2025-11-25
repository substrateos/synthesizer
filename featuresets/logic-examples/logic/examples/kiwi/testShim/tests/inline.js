export const attributes = {
    type: "example/json"
}

const X = Symbol('X');
const Y = Symbol('Y');
const Debug = Symbol('Debug');

export default [
    {
        description: "Inequality: X > 10 (Lazy Boundary)",
        predicate: "run_constraint_system",
        method: "findall",
        params: [
            {X},
            // The System: Defines the constraints
            [`export default function inequality([Val]) {
                Val > 10;
            }`,
            // The Vars: Passed to the system and solved
            [X], Debug]
        ],
        // Kiwi defaults to EPSILON (0.001) from the boundary
        returns: [{ X: 10.001 }],
    },
    {
        description: "Linear System: X + Y = 10, X - Y = 2",
        predicate: "run_constraint_system",
        method: "findall",
        params: [
            {X, Y},
            [`export default function linear([A, B]) {
                A + B === 10;
                A - B === 2;
            }`,
            [X, Y], Debug]
        ],
        // Algebra: 2X = 12 -> X=6, Y=4
        returns: [{ X: 6, Y: 4 }]
    },
    {
        description: "Contradiction: X > 10 && X < 5",
        predicate: "run_constraint_system",
        method: "findall",
        params: [
            {X},
            [`export default function impossible([A]) {
                A > 10;
                A < 5;
            }`,
            [X], Debug]
        ],
        // Expect failure (empty results)
        returns: [] 
    },
]
