import parseLogic from "@/lib/logic/parser.js";
import analyzeProgram from "@/lib/logic/compile/analyze/program.js";
import transformScript from "@/lib/logic/compile/transform/script.js";
import transformModule from "@/lib/logic/compile/transform/module.js";
import runtime from "@/lib/logic/runtime.js"

export default function compileProgram({ source, outputFormat }) {
    // ast: masked AST (script mode)
    // imports: extracted import metadata
    // exports: extracted export metadata (from module mode)
    const { ast, imports, exports: parserExports } = parseLogic(source);

    // We pass parserExports so the analyzer knows if explicit exports exist.
    // The analyzer returns a normalized 'exports' list (populating defaults if needed).
    const { isModule, topLevelScope, exports: analyzedExports } = analyzeProgram(ast, source, imports, parserExports);

    if (!outputFormat) {
        outputFormat = isModule ? 'module' : 'script'
    }

    let transformProgram
    switch (outputFormat) {
        case 'module':
            transformProgram = transformModule
            break
        case 'script':
            transformProgram = transformScript
            break
        default:
            throw new Error('outputFormat must be either module or script')
    }

    const generatedSource = transformProgram({ topLevelScope, imports, exports: analyzedExports });

    const result = {
        generatedSource,
        imports,
        exports: analyzedExports,
        isModule,
        outputFormat,
        runtime,
    };

    return result;
}
