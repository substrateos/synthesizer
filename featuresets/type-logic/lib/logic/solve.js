import GoalSeries from "@/lib/logic/GoalSeries.js";
import compileProgram from "@/lib/logic/compile/program.js";
import resolveSolution from "@/lib/logic/solution.js";

// Exported tags for accessing internal metadata and the resolver.
import {
    predicatesTag,
    resolverTag,
    configTag,
    nameTag,
    generatedSourceTag,
    resolverTags,
} from "@/lib/logic/tags.js"

/**
 * A recursive helper that creates a query function with a specific configuration.
 * The returned function is chainable via its own .configure() method.
 * @param {object} config - The configuration for this query function.
 * @returns {function} A configured async generator function for querying.
 */
function createConfiguredQuery(config) {
    const query = config.newQuery();
    query.bind = (() => {
        const originalBind = query.bind;
        const newBind = function (...bindArgs) {
            const fn = originalBind.apply(this, bindArgs)
            for (const tag of resolverTags) {
                if (tag in this) {
                    fn[tag] = this[tag]
                }
            }
            fn.bind = newBind
            return fn
        }
        return newBind
    })();

    // Attach metadata and the raw resolver using the exported tags.
    query[predicatesTag] = config.predicates;
    query[resolverTag] = config.resolver;
    query[configTag] = {...config};

    /**
     * Returns a new, configured query function that inherits the current
     * configuration and layers new settings on top.
     * @param {object} newConfig - The new scheduler or tracer to apply.
     * @returns {function} A new, chainable query function.
     */
    query.configure = (newConfig) => {
        // Inherit old config and override with new settings.
        const mergedConfig = { ...config, ...newConfig };
        return createConfiguredQuery(mergedConfig);
    };

    return query;
}

function createConfiguredTemplateTag(baseConfig) {
    /**
     * A template tag function that transpiles a logic program and returns a
     * database of configurable, ready-to-query predicate functions.
     */
    function templateTag(strings, ...values) {
        // Reconstruct the source code from the template literal parts. This handles
        // both direct source (`solve`...`) and interpolated source (`solve`${...}`).
        const source = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

        const initialConfig = {
            ...baseConfig,
            newGoal(...args) {
                const Goal = GoalSeries({defaultSchedulerClass: this.defaultSchedulerClass})
                const scheduler = this.schedulerClass ? new (this.schedulerClass)() : undefined
                return new Goal({scheduler, resolver: this.resolver, args, tracer: this.tracer});
            }
        }
        const { generatedSource, utils } = compileProgram(source);

        const factory = new Function(`return (${generatedSource})`);
        const rawDatabase = factory()(utils);

        const finalDatabase = {};
        for (const predName in rawDatabase) {
            const resolver = rawDatabase[predName];
            resolver[nameTag] = predName;
            finalDatabase[predName] = createConfiguredQuery({...initialConfig, resolver});
        }
        finalDatabase[generatedSourceTag] = generatedSource; 
    
        return finalDatabase;
    }
    templateTag.configure = (newConfig) => {
        return createConfiguredTemplateTag({...baseConfig, ...newConfig})
    }

    return templateTag
}

export const solve = createConfiguredTemplateTag({
    newQuery() {
        const config = this
        return function* (...args) {
            const goal = config.newGoal(...args)
            for (const solution of goal.solve()) {
                yield resolveSolution(args, solution)
            }
        }
    },
})

export const solveAsync = createConfiguredTemplateTag({
    newQuery() {
        const config = this
        return async function* (...args) {
            const goal = config.newGoal(...args)
            for await (const solution of goal.solveAsync()) {
                yield resolveSolution(args, solution)
            }
        }
    },
})
