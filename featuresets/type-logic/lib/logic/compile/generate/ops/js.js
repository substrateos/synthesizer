import value from '@/lib/logic/compile/generate/blocks/value';

export default ({ target, rawString, logicVars }) => {
  // 1. Get the list of argument *values* to pass to the IIFE
  const resolvedArgValues = logicVars.map(varName => 
    value({ type: 'Identifier', name: varName }, 'bindings')
  );

  // 2. Use the raw string directly as the IIFE body
  const iifeBody = rawString;

  // 3. Use the logicVars list directly as the IIFE parameter names
  const iifeParamNames = logicVars.join(', ');

  return `
// --- Logic.js IIFE ---
// Evaluate the JS expression in a sandboxed IIFE.
const computedValue = (function(${iifeParamNames}) {
    return ${iifeBody};
})(${resolvedArgValues.join(', ')});

bindings = unify(${value(target, 'bindings')}, computedValue, bindings, location);
if (bindings) {
    pc++; // Success, continue to the next goal.
    // fallthrough
} else {
    // Unification with the computed value failed.
    yieldValue = { type: 'fail' };
    continue;
}
`;
}
