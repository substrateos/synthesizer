import value from "@/lib/logic/compile/generate/blocks/value.js";

export default ({ term, negated }) => `
if (${negated ? '!' : ''}unify.isGround(${value(term, 'bindings')})) {
    pc++; // is_ground is true, succeed and continue.
    // fallthrough
} else {
    // is_ground is false, fail this clause.
    yieldValue = { type: 'fail' };
    continue;
}
`;