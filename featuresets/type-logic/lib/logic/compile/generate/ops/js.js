import value from "@/lib/logic/compile/generate/blocks/value.js";
import ground from "@/lib/logic/compile/generate/blocks/ground.js";

export default ({ target, rawString, logicVars }, clauseId, pc) => {
  // 1. Get the list of argument *values* to pass to the IIFE
  const resolvedArgValues = logicVars.map(varName => 
    ground({ type: 'Identifier', name: varName }, 'bindings')
  );

  // 2. Use the raw string directly as the IIFE body
  const iifeBody = rawString;

  // 3. Use the logicVars list directly as the IIFE parameter names
  const iifeParamNames = logicVars.join(', ');

  return `
let value
switch (oppc) {
case undefined: {
  // Evaluate the JS expression in a sandboxed IIFE.
  let shouldFail = undefined;
  const Logic = {
    fail: (reason) => (shouldFail = {reason}),
    isGround: (v) => unify.isGround(v),
  }; // TODO only lazily insert the Logic helper
  value = (function(${iifeParamNames}){ return ${iifeBody} }).call(Logic, ${resolvedArgValues.join(', ')});
  if (shouldFail) {
    yieldValue = {type: 'fail', reason: shouldFail.reason}
    continue
  }
  if (value instanceof Promise) {
    yieldValue = {
      type: 'await',
      promise: value,
      resume: {
        clauseId: ${clauseId},
        pc: ${pc},
        bindings,
        vars,
        scopes,
        oppc: 1,
        checkShouldFail: () => shouldFail,
      },
    };
    continue;
  }
  oppc = 1;
  // fallthrough
}
case 1: {
  if (value === undefined && resumeValue !== undefined) {
    const shouldFail = resume?.checkShouldFail()
    if (shouldFail) {
      yieldValue = {type: 'fail', reason: shouldFail.reason}
      continue
    }
    if (resumeValue.status === 'resolved') {
      value = resumeValue.value
    } else {
      throw resumeValue.error
    }
  }
  bindings = unify(${value(target, 'bindings')}, value, bindings, location);
  if (bindings) {
    pc++; // Success, continue to the next goal.
    oppc = undefined;
    break
  } else {
    // Unification with the computed value failed.
    yieldValue = { type: 'fail' };
    continue;
  }
}
}
`;
}
