import compileProgram from "@/lib/logic/compile/program.js";
import runtime from "@/lib/logic/runtime.js";
import { nameTag, generatedSourceTag } from "@/lib/logic/tags.js"

function createConfiguredTemplateTag(config) {
    /**
     * A template tag function that transpiles a logic program and returns a
     * database of configurable, ready-to-query predicate functions.
     */
    function templateTag(strings, ...values) {
        // Reconstruct the source code from the template literal parts. This handles
        // both direct source (`solve`...`) and interpolated source (`solve`${...}`).
        const source = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
        const { generatedSource, runtime } = compileProgram({source, outputFormat: 'script'});

        let factory
        try {
            factory = new Function(`return (${generatedSource})`);
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new SyntaxError(e.message + `\ngeneratedSource:\n${generatedSource}`)
            }
            throw e
        }
        const rawDatabase = factory()(runtime);

        const finalDatabase = {};
        for (const predName in rawDatabase) {
            const resolver = rawDatabase[predName];
            resolver[nameTag] = predName;
            finalDatabase[predName] = runtime.createConfiguredQuery({ ...config, resolver });
        }
        finalDatabase[generatedSourceTag] = generatedSource;

        return finalDatabase;
    }
    templateTag.configure = (newConfig) => {
        return createConfiguredTemplateTag({ ...config, ...newConfig })
    }

    return templateTag
}

export const solve = createConfiguredTemplateTag({...runtime.baseConfig, async: false})

export const solveAsync = createConfiguredTemplateTag({...runtime.baseConfig, async: true})
