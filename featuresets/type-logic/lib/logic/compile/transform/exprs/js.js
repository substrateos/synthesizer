import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

export default ({ target, rawString, logicVars }) => {
  // Get the list of argument *values* to pass to the IIFE
  const resolvedArgValues = logicVars.map(varName =>
    groundExpr({ type: 'Identifier', name: varName }, 'bindings')
  );

  // Use the raw string directly as the IIFE body
  const iifeBody = rawString;

  // Use the logicVars list directly as the IIFE parameter names
  const iifeParamNames = logicVars.join(', ');

  return [
    'let value',
    switchExpr('oppc', [
      ['undefined',
        `// Evaluate the JS expression in a sandboxed IIFE.`,
        `let shouldFail = undefined;`,
        `const Logic = {`,
        `    fail: (reason) => (shouldFail = {reason}),`,
        `    isGround: (v) => unify.isGround(v),`,
        `}; // TODO only lazily insert the Logic helper`,
        `value = (function(${iifeParamNames}){ return ${iifeBody} }).call(Logic, ${resolvedArgValues.join(', ')});`,
        `if (shouldFail) {`,
        `    yieldValue = {type: 'fail', reason: shouldFail.reason}`,
        `    continue`,
        `}`,
        `if (value instanceof Promise) {`,
        `    yieldValue = {`,
        `        type: 'await',`,
        `        promise: value,`,
        `        resume: {`,
        `            clauseId,`,
        `            pc,`,
        `            bindings,`,
        `            vars,`,
        `            scopes,`,
        `            oppc: 1,`,
        `            checkShouldFail: () => shouldFail,`,
        `        },`,
        `    };`,
        `    continue;`,
        `}`,
        `oppc = 1;`,
        `// fallthrough`,
        e => e.fallthrough()],
      [1,
        `if (value === undefined && resumeValue !== undefined) {`,
        `    const shouldFail = resume?.checkShouldFail()`,
        `    if (shouldFail) {`,
        `        yieldValue = {type: 'fail', reason: shouldFail.reason}`,
        `        continue`,
        `    }`,
        `    if (resumeValue.status === 'resolved') {`,
        `        value = resumeValue.value`,
        `    } else {`,
        `        throw resumeValue.error`,
        `    }`,
        `}`,
        `bindings = unify(${valueExpr(target, 'bindings')}, value, bindings, location);`,
        `if (bindings) {`,
        `    pc++; // Success, continue to the next goal.`,
        `    oppc = undefined;`,
        `} else {`,
        `    // Unification with the computed value failed.`,
        `    yieldValue = { type: 'fail' };`,
        `    continue;`,
        `}`,
        e => e.break()],
    ]),
  ]
}