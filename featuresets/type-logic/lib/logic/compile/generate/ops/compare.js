import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ op, startLocation }) => `
const location = ${JSON.stringify(startLocation)};
const left = ${value(op.left, 'bindings')};
const right = ${value(op.right, 'bindings')};
if ((left ${op.operator} right)) {
    pc++; // Comparison is true
    // fallthrough
} else {
    yieldValue = { type: 'fail', location };
    continue;
}
`;
