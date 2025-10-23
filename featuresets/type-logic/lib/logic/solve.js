import GoalSeries from "@/lib/logic/GoalSeries";
import transpile from '@/lib/logic/compile/program';
import resolveSolution from '@/lib/logic/solution';

// Exported tags for accessing internal metadata and the resolver.
import {
    predicatesTag,
    resolverTag,
    configTag,
    nameTag,
    generatedSourceTag,
    resolverTags,
} from '@/lib/logic/tags'

/**
 * A recursive helper that creates a query function with a specific configuration.
 * The returned function is chainable via its own .configure() method.
 * @param {object} config - The configuration for this query function.
 * @returns {function} A configured async generator function for querying.
 */
function createConfiguredQuery(config) {
    // This is the actual async generator that will be returned.
    const query = function* (...args) {
        const Goal = GoalSeries({defaultSchedulerClass: config.defaultSchedulerClass})
        const scheduler = config.schedulerClass ? new (config.schedulerClass)() : undefined
        const goal = new Goal({
            scheduler,
            resolver: config.resolver,
            args,
            tracer: config.tracer,
        });

        for (const solution of goal.solve()) {
            yield resolveSolution(args, solution)
        }
    };

    query.bind = (() => {
        const originalBind = query.bind;
        const newBind = function (...bindArgs) {
            const fn = originalBind.apply(this, bindArgs)
            for (const tag in resolverTags) {
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

/**
 * A template tag function that transpiles a logic program and returns a
 * database of configurable, ready-to-query predicate functions.
 */
export default function solve(strings, ...values) {
    // Reconstruct the source code from the template literal parts. This handles
    // both direct source (`solve`...`) and interpolated source (`solve`${...}`).
    const source = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

    const { transpiledCode, utils, predicates } = transpile(source);

    const factory = new Function(`return (${transpiledCode})`);
    const rawDatabase = factory()(utils);

    const finalDatabase = {};
    for (const predName in rawDatabase) {
        const resolver = rawDatabase[predName];

        resolver[nameTag] = predName;        

        finalDatabase[predName] = createConfiguredQuery({
            resolver,
            predicates: predicates[predName]
        });
    }
    finalDatabase[generatedSourceTag] = transpiledCode; 
   
    return finalDatabase;
}
