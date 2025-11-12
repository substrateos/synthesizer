import groundExpr from "@/lib/logic/compile/transform/exprs/ground.js";
import valueExpr from "@/lib/logic/compile/transform/exprs/value.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";

/**
 * Parses a `Logic.findall` call expression.
 * @param {object} expr - The CallExpression AST node.
 * @param {ClauseInfo} context - The transformation context containing { scope, ... }.
 * @returns {object} A 'findall' instruction for the IR.
 */
export default (expr, context) => {
    // Validate arguments
    if (expr.arguments.length !== 3) {
        throw new Error('Logic.findall requires exactly 3 arguments: Template, Goal, and List.');
    }
    const [template, call, target] = expr.arguments;
    if (call.type !== 'CallExpression' || call.callee.type !== 'Identifier') {
        throw new Error('The second argument to Logic.findall must be a simple predicate call (e.g., myPred(X)).');
    }

    // Resolve Predicate Name
    const predName = call.callee.name;
    const resolution = context.scope.resolveName(predName);

    // Validate Resolution
    if (!resolution) {
        throw new Error(`Undefined predicate in Logic.findall: ${predName}`);
    }
    if (resolution.type !== 'predicate') {
        throw new Error(`The goal in Logic.findall must be a predicate, not a variable: ${predName}`);
    }

    const resolverName = resolution.definition.mangledName
    const scopeDepth = resolution.scope.depth

    const scopeSliceCode = (scopeDepth === 0)
        ? 'null' // Global predicates get null scope
        : `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;

    const goalArgsCode = `[${call.arguments.map(node => groundExpr(node, 'bindings')).join(', ')}]`;
    const targetCode = valueExpr(target, 'bindings');
    const templateCode = groundExpr(template, 'subgoalBindings');

    return [
        `const findallSolutions = resume.findallSolutions ?? [];`,
        switchExpr('oppc', [
            ['undefined',
                `const resolver = ${resolverName}.bind(null, ${scopeSliceCode});`,
                `yieldValue = { // Initial 'call' for this subgoal.`,
                `    type: 'call',`,
                `    op: 'call',`,
                `    resolver,`,
                `    goal: ${goalArgsCode},`,
                `    resume: { clauseId, pc, bindings, vars, scopes, oppc: 1 }`,
                `}`,
                e => e.continue()],
            [1,
                `if (subgoalSolution) {`,
                `    // Solution found. Create a combined binding context for resolution.`,
                `    const subgoalBindings = { ...bindings, ...subgoalSolution };`,
                ``,
                `    // Build the result object from the template and add to list.`,
                `    const subgoalResult = ${templateCode};`,
                `    findallSolutions.push(subgoalResult);`,
                ``,
                `    // If more solutions are available, get them.`,
                `    if (subgoalRedoKey) {`,
                `        yieldValue = {`,
                `            type: 'call',`,
                `            op: 'redo',`,
                `            key: subgoalRedoKey,`,
                `            resume: {`,
                `                clauseId,`,
                `                pc,`,
                `                bindings,`,
                `                vars,`,
                `                scopes,`,
                `                oppc: 1,`,
                `                findallSolutions,`,
                `            }`,
                `        }`,
                `        continue;`,
                `    }`,
                `}`,
                ``,
                `// This point is reached when the inner goal has no more solutions (subgoalSolution is undefined)`,
                `bindings = unify(${targetCode}, findallSolutions, bindings, location);`,
                `if (bindings) {`,
                `    pc++; // Success`,
                `    resume = { clauseId, pc, bindings, vars, scopes};`,
                `    oppc = undefined;`,
                `    subgoalSolution = undefined;`,
                `    subgoalResult = undefined;`,
                `    // fallthrough`,
                `} else {`,
                `    yieldValue = { type: 'fail' };`,
                `    break;`,
                `}`,
                e => e.fallthrough()]
        ])
    ];
};