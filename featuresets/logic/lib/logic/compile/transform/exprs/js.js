import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

/**
 * Generates the IIFE boilerplate for evaluating arbitrary JavaScript.
 * @param {string} target - The code string for the target variable (e.g. "vars.Result").
 * @param {string} rawString - The user's JS code (body of the IIFE).
 * @param {string[]} paramNames - List of formal parameter names for the IIFE (e.g. ["A", "Math"]).
 * @param {string[]} argValues - List of runtime expressions to pass as arguments (e.g. ["unify.ground(...)", "$i_Math"]).
 */
export default ({ target, rawString, paramNames, argValues }) => {
  
  const iifeBody = rawString;
  const iifeParamNames = paramNames.join(', ');
  const iifeArgs = argValues.join(', ');

  return [
    'let value',
    switchExpr('oppc', [
      ['undefined',
        `// Evaluate the JS expression in a sandboxed IIFE.`,
        `let shouldFail = undefined;`,
        `const Logic = {`,
        `    fail: (reason) => (shouldFail = {reason}),`,
        `    isGround: (v) => unify.isGround(v),`,
        `    constraints: (v) => unify.constraints(v, bindings),`,
        `}; // TODO only lazily insert the Logic helper`,
        
        // Execute the IIFE, passing in grounded logic vars and raw imports
        `value = (function(${iifeParamNames}){ return ${iifeBody} }).call(Logic, ${iifeArgs});`,
        
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
        // Bind the result of the JS expression to the target variable
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
