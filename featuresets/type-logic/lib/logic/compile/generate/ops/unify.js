import reference from '@/lib/logic/compile/generate/blocks/reference';

export default ({ op, isRightAlreadyResolved }) => {
    // If the RHS is already resolved by the analyzer (e.g., to a predicate name),
    // we use its value directly as a JS variable.
    // Otherwise, it's a logic term that needs the `value()` helper for runtime resolution.
    const rightHandSide = isRightAlreadyResolved ? op.right.name : reference(op.right);

    return `
bindings = unify(${reference(op.left)}, ${rightHandSide}, bindings, location);
if (bindings) {
    pc++; // Success, continue to the next goal.
    // fallthrough
} else {
    // Unification failed.
    yieldValue = { type: 'fail' };
    continue;
}
`;
}
