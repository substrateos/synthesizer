import transformFunctionDeclaration from "@/lib/logic/compile/transform/nodes/FunctionDeclaration.js";
import clauseExpr from "@/lib/logic/compile/transform/exprs/clause.js";
import subgoalExpr from "@/lib/logic/compile/transform/exprs/subgoal.js";
import blockExpr from "@/lib/logic/compile/transform/exprs/block.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";
import iifeExpr from "@/lib/logic/compile/transform/exprs/iife.js";

/**
 * Transforms a PredicateDefinition (from the analysis scope tree) into its IR format.
 * @param {PredicateDefinition} predicateDef - The predicate definition from analyzeScopes.
 * @param {Scope} scope - The parent scope where this predicate was defined (provides context).
 * @returns {object} The final IR object for the predicate { name, mangledName, clauses }.
 */
export default function transformPredicate(predicateDef) {
    const name = predicateDef.name
    const mangledName = predicateDef.mangledName
    const clauseEntries = [
        ...predicateDef.clauses.map((clauseInfo, clauseId) => [clauseId, transformFunctionDeclaration(clauseInfo)]),
        ...(predicateDef.shadows
            ? [[predicateDef.clauses.length, clauseExpr({
                declaredVars: [],
                body: [
                    subgoalExpr({
                        resolverName: predicateDef.shadows, // Mangled name of the predicate we fall back TO
                        isLexicalChild: false, // Not a lexically nested call relative to the inner definition
                        goalArgs: 'goal', // Special instruction to pass original arguments
                        call: {}, // Dummy AST node for signature matching
                    }),
                ],
            })]]
            : []
        ),
    ]

    if (clauseEntries.length == 0) {
        return []
    }

    // Each clause (plus the optional fallback) will be a choice point.
    const forksArray = `${JSON.stringify(clauseEntries.map(([clauseId]) => ({ resume: { clauseId } })))}`;

    return [
        `/**`,
        ` * Transpiled resolver for the '${name}' predicate.`,
        ` */`,
        blockExpr(`function* ${mangledName}(parentScopes, ...goal)`,
            'let yieldValue;',
            '',
            `yieldValue = {type: 'fork', forks: ${forksArray}};`,
            blockExpr('while (true)',
                'const step = yield yieldValue;',
                'let { pc, oppc, clauseId } = step.resume ?? {};',
                'yieldValue = undefined; // reset',
                switchExpr('clauseId', [
                    ...clauseEntries.map(([clauseId, clause]) =>
                        [clauseId,
                            clause,
                            e_case => e_case.break()]),
                    ['default',
                        `yieldValue = {type: 'fail'}`,
                        e_default => e_default.break()],
                ]))),
        `${mangledName}[nameTag] = '${name}';`,
        iifeExpr(`${mangledName}.bind = (() =>`, [
            `const originalBind = ${mangledName}.bind;`,
            'const newBind = function (...bindArgs) {',
            '    const fn = originalBind.apply(this, bindArgs)',
            '    for (const tag of resolverTags) {',
            '        if (tag in this) {',
            '            fn[tag] = this[tag]',
            '        }',
            '    }',
            '    fn.bind = newBind',
            '    return fn',
            '}',
            'return newBind'
        ]),
        '',
    ]
}
