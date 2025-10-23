import {parse as acornParse} from "@/lib/logic/acorn@8.15.0";
import analyzeProgram from '@/lib/logic/compile/analyze/program';
import transformProgram from '@/lib/logic/compile/transform/program';
import generatePredicateResolver from '@/lib/logic/compile/generate/predicate';
import unify, { resolve } from '@/lib/logic/unify';
import { resolverTags, resolverTag, nameTag } from '@/lib/logic/tags';
import ArrayPattern from '@/lib/logic/unify/ArrayPattern';
import ObjectPattern from '@/lib/logic/unify/ObjectPattern';

// --- Main Transpilation Logic ---

export default function transpile(sourceCode) {
    // --- Step 1: Parse the source to get an AST ---
    const ast = acornParse(sourceCode, { ecmaVersion: 2022, sourceType: 'script' });

    // --- Step 2: Analysis Pass ---
    // This pass discovers all clauses and resolves their lexical scopes.
    const { annotatedClauseMap, isModule, exportedPredicates } = analyzeProgram(ast);

    // --- Step 3: IR Transform Pass ---
    // This pass transforms the annotated map into the final IR for codegen.
    const predicates = transformProgram(annotatedClauseMap);

    // --- Step 4: Code Generation ---
    // This pass takes the final IR and generates the JavaScript resolver code.
    let resolverCode = '';
    for (const predName in predicates) {
        const ir = predicates[predName];
        if (ir.clauses.length > 0 || ir.fallback) {
            resolverCode += generatePredicateResolver(predName, ir);
        }
    }

    let transpiledCode;
    // --- Step 4: Assemble the final output string ---
    if (isModule) {
        const exports = Array.from(exportedPredicates)
            .map(name => `export const ${name} = pred_${name};`)
            .join('\n');

        transpiledCode = `
import unify, { resolve } from '@/lib/logic/unify';
import ArrayPattern from '@/lib/logic/unify/ArrayPattern';
import ObjectPattern from '@/lib/logic/unify/ObjectPattern';
import { resolverTags, resolverTag, nameTag } from '@/lib/logic/tags';

${resolverCode}

// --- Public, unmangled exports ---
${exports}
`;
    } else {
        const databaseEntries = Array.from(
            Object.values(annotatedClauseMap)
            .filter(clause => clause.parent === null)
            .reduce((map, clause) => {
                map.set(clause.name, clause.mangledName);
                return map;
            }, new Map()))
        .map(([localName, mangledName]) => `${localName}: ${mangledName}.bind(null, null)`)
        .join(',\n        ');

        transpiledCode = `(function(utils) {
    const { unify, resolve, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern } = utils;

    ${resolverCode}

    // --- The Public API Object ---
    const database = {
        ${databaseEntries}
    };

    return database;
})`;
    }

    return {
        transpiledCode,
        utils: { unify, resolve, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern },
        predicates,
    };
}
