import {parse as acornParse} from "@/lib/logic/acorn@8.15.0.js";
import analyzeProgram from "@/lib/logic/compile/analyze/program.js";
import transformProgram from "@/lib/logic/compile/transform/program.js";
import unify, { resolve } from "@/lib/logic/unify.js";
import { resolverTags, resolverTag, nameTag } from "@/lib/logic/tags.js";
import ArrayPattern from "@/lib/logic/unify/ArrayPattern.js";
import ObjectPattern from "@/lib/logic/unify/ObjectPattern.js";

export default function compileProgram(sourceCode) {
    const ast = acornParse(sourceCode, { ecmaVersion: 2022, sourceType: 'script' });

    // Discover all clauses and resolves their lexical scopes.
    const { isModule, topLevelScope } = analyzeProgram(ast, sourceCode);

    // Transform the topLevelScope into JavaScript.
    const generatedSource = transformProgram(topLevelScope);

    return {
        generatedSource,
        utils: { unify, resolve, resolverTags, resolverTag, nameTag, ArrayPattern, ObjectPattern },
    };
}
