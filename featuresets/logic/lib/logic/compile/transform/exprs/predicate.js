import transformFunctionDeclaration from "@/lib/logic/compile/transform/nodes/statements/FunctionDeclaration.js";
import clauseExpr from "@/lib/logic/compile/transform/exprs/clause.js";
import callExpr from "@/lib/logic/compile/transform/exprs/call.js";
import blockExpr from "@/lib/logic/compile/transform/exprs/block.js";
import switchExpr from "@/lib/logic/compile/transform/exprs/switch.js";
import iifeExpr from "@/lib/logic/compile/transform/exprs/iife.js";

export default function transformPredicate(predicateDef, scope, hasImports) {
    const name = predicateDef.name
    const mangledName = predicateDef.mangledName
    const clauseEntries = [
        ...predicateDef.clauses.map((clauseInfo, clauseId) => [clauseId, transformFunctionDeclaration(clauseInfo)]),
        ...(predicateDef.shadows
            ? [[predicateDef.clauses.length, clauseExpr({
                declaredVars: [],
                body: [
                    callExpr({
                        resolverExpr: `${predicateDef.shadows}.bind(null, null)`,
                        argsExpr: 'goal',
                    }),
                ],
                scope: { resolveName: () => null }, 
            })]]
            : []
        ),
    ]

    if (clauseEntries.length == 0) {
        return []
    }

    const forksArray = `${JSON.stringify(clauseEntries.map(([clauseId]) => ({ resume: { clauseId } })))}`;

    // Inject the gatekeeper check with error handling
    const importCheck = hasImports ? [
        `if (!$importsReady) {`,
        `    const step = yield { type: 'await', promise: $importsPromise, resume: { start: true } };`,
        `    if (step.resumeValue && step.resumeValue.status === 'rejected') {`,
        `        throw step.resumeValue.error;`,
        `    }`,
        `}`
    ] : [];

    return [
        `/**`,
        ` * Transpiled resolver for the '${name}' predicate.`,
        ` */`,
        blockExpr(`function* ${mangledName}(parentScopes, ...goal)`,
            ...importCheck,
            'let yieldValue;',
            '',
            `yieldValue = {type: 'fork', forksNeedBindings: true, forks: ${forksArray}};`,
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