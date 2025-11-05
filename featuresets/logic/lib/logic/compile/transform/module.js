import predicateExpr from "@/lib/logic/compile/transform/exprs/predicate.js";
import Emitter from "@/lib/logic/compile/transform/Emitter.js";

function extractPredicates(scope) {
    return [
        ...Array.from(scope.declaredPredicates.values(), predicateDef => predicateExpr(predicateDef, scope)),
        ...Array.from(scope.declaredPredicates.values())
            .flatMap(predicateDef => predicateDef.clauses.flatMap(clauseInfo => extractPredicates(clauseInfo.scope))),
    ]
}

function reconstructImports(imports, scope) {
    return imports.map(imp => {
        if (imp.specifiers.length === 0) {
            return `import '${imp.source}';`;
        }

        const lines = [];
        
        const namespaces = imp.specifiers.filter(s => s.type === 'namespace');
        for (const ns of namespaces) {
            const mangled = scope.resolveName(ns.local).definition.mangledName;
            lines.push(`import * as ${mangled} from '${imp.source}';`);
        }

        const namedOrDefault = imp.specifiers.filter(s => s.type !== 'namespace');
        if (namedOrDefault.length > 0) {
            const parts = namedOrDefault.map(spec => {
                const mangled = scope.resolveName(spec.local).definition.mangledName;
                if (spec.type === 'default') {
                    return `default as ${mangled}`;
                } else {
                    return `${spec.imported} as ${mangled}`;
                }
            });
            lines.push(`import { ${parts.join(', ')} } from '${imp.source}';`);
        }

        return lines.join('\n');
    }).join('\n');
}

export default ({topLevelScope, imports, exports}) => {
    const resolvers = Emitter.from(extractPredicates(topLevelScope));

    const headerImports = reconstructImports(imports, topLevelScope);
    
    const exportStatements = [];
    for (const exportMeta of exports) {
        const resolution = topLevelScope.resolveName(exportMeta.name);
        if (resolution && resolution.type === 'predicate') {
            const mangledName = resolution.definition.mangledName;
            const publicName = exportMeta.name;
            const wrapperCode = `createConfiguredQuery({ ...baseConfig, async: true, compiler: logic.compile, resolver: ${mangledName}.bind(null, null), name: '${publicName}' })`;

            if (exportMeta.type === 'default') {
                exportStatements.push(`export default ${wrapperCode};`);
            } else {
                exportStatements.push(`export const ${publicName} = ${wrapperCode};`);
            }
        }
    }

    return `
${headerImports}

import runtime from "@/lib/logic/runtime.js";
const { unify, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern, Value, createConfiguredQuery, _, baseConfig } = runtime;

${resolvers}

// --- Exports ---
${exportStatements.join('\n')}
`;
}