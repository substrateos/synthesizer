import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ op }) => `
if (${value(op.left, 'bindings')} ${op.operator} ${value(op.right, 'bindings')}) {
    pc++; // Comparison is true
    // fallthrough
} else {
    yieldValue = { type: 'fail' };
    continue;
}
`;
