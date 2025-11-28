import predicateExpr from "@/lib/logic/compile/transform/exprs/predicate.js";
import Emitter from "@/lib/logic/compile/transform/Emitter.js";

function extractPredicates(scope, hasImports) {
    return [
        ...Array.from(scope.declaredPredicates.values(), predicateDef => predicateExpr(predicateDef, scope, hasImports)),
        ...Array.from(scope.declaredPredicates.values())
            .flatMap(predicateDef => predicateDef.clauses.flatMap(clauseInfo => extractPredicates(clauseInfo.scope, hasImports))),
    ]
}

/**
 * Generates a Factory Function (Script Mode).
 * Returns a `database` object containing predicates.
 */
export default ({ topLevelScope, imports = [], exports = [] }) => {
    const hasImports = imports.length > 0;
    const resolvers = Emitter.from(extractPredicates(topLevelScope, hasImports))
    
    // Build database entries from the normalized 'exports' list.
    const databaseEntries = [];
    for (const exp of exports) {
        const resolution = topLevelScope.resolveName(exp.name);
        if (resolution && resolution.type === 'predicate') {
            // Handle renaming for 'default' exports
            const key = exp.type === 'default' ? 'default' : exp.name;
            databaseEntries.push(`${key}: ${resolution.definition.mangledName}.bind(null, null)`);
        }
    }

    let loaderCode = '';
    if (hasImports) {
        const allSpecifiers = imports.flatMap(i => i.specifiers);
        
        // a) Declare variables. Look up mangled name from Scope.
        const declarations = allSpecifiers.map(spec => {
            const mangled = topLevelScope.resolveName(spec.local).definition.mangledName;
            return `let ${mangled};`;
        }).join(' ');
        
        const importCalls = imports.map(imp => `import('${imp.source}')`).join(',\n        ');
        
        const assignments = imports.map((imp, i) => {
            return imp.specifiers.map(spec => {
                const modRef = `m[${i}]`;
                const target = topLevelScope.resolveName(spec.local).definition.mangledName;
                
                if (spec.type === 'default') return `${target} = ${modRef}.default;`;
                if (spec.type === 'namespace') return `${target} = ${modRef};`;
                return `${target} = ${modRef}['${spec.imported}'];`;
            }).join('\n        ');
        }).join('\n        ');

        loaderCode = `
    // --- Dynamic Import Loader ---
    ${declarations}
    let $importsReady = false;
    let $importsResult;

    const $importsPromise = Promise.all([
        ${importCalls}
    ]).then(m => {
        $importsResult = m;
        ${assignments}
        $importsReady = true;
        return m;
    });
    `;
    }

    return `(function(runtime) {
const { unify, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern, Value, _, createTracer, runnableGoalsTag, scheduleRunnableGoals } = runtime;
${loaderCode}

${resolvers}

    const database = {
        ${databaseEntries.join(',\n        ')}
    };

    return database;
})`
}
