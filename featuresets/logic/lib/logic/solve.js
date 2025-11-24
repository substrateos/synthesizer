import compileProgram from "@/lib/logic/compile/program.js";
import runtime from "@/lib/logic/runtime.js";

function createConfiguredTemplateTag(config) {
    /**
     * A template tag function that transpiles a logic program and returns a
     * database of configurable, ready-to-query predicate functions.
     */
    function templateTag(strings, ...values) {
        // Reconstruct the source code from the template literal parts. This handles
        // both direct source (`solve`...`) and interpolated source (`solve`${...}`).
        const source = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
        return config.compile(source)
    }
    templateTag.configure = (newConfig) => {
        return createConfiguredTemplateTag({ ...config, ...newConfig })
    }

    return templateTag
}

export const solve = createConfiguredTemplateTag({...runtime.baseConfig, compiler: compileProgram, async: false})

export const solveAsync = createConfiguredTemplateTag({...runtime.baseConfig, compiler: compileProgram, async: true})
