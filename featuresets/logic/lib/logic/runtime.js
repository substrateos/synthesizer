import {
    predicatesTag,
    resolverTag,
    configTag,
    nameTag,
    generatedSourceTag,
    resolverTags,
    runnableGoalsTag,
    _,
} from "@/lib/logic/tags.js"

import GoalSeries from "@/lib/logic/GoalSeries.js";
import scheduleRunnableGoals from "@/lib/logic/runtime/scheduleRunnableGoals.js";
import unify from "@/lib/logic/unify.js";
import createTracer from "@/lib/logic/tracer.js";
import ObjectPattern from "@/lib/logic/unify/ObjectPattern.js";
import ArrayPattern from "@/lib/logic/unify/ArrayPattern.js";
import Value from "@/lib/logic/unify/Value.js";
import resolveSolution from "@/lib/logic/solution.js";
import findall from "@/lib/logic/findall.js";

const baseConfig = {
    compile(source) {
        if (!this.compiler) {
            throw new Error("Compiler is not available in this configuration.");
        }
        
        const { generatedSource, runtime, exports } = this.compiler({ source, outputFormat: 'script' });
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

        const wrapped = {};
        for (const key in rawDatabase) {
            const resolver = rawDatabase[key]
            resolver[nameTag] = key;
            wrapped[key] = createConfiguredQuery({ ...this, resolver })
        }

        const defaultExport = exports.find(e => e.type === 'default');
        return defaultExport ? wrapped.default : wrapped;
    },
    newGoal(...args) {
        const config = Object.freeze({...this})
        const Goal = GoalSeries({ defaultSchedulerClass: this.defaultSchedulerClass, config })
        const scheduler = this.schedulerClass ? new (this.schedulerClass)() : undefined
        return new Goal({ scheduler, resolver: this.resolver, args, tracer: this.tracer });
    },
    newQuery() {
        const config = this
        if (config.async) {
            return async function* (...args) {
                const goal = config.newGoal(...args)
                for await (const solution of goal.solveAsync()) {
                    yield resolveSolution(args, solution)
                }
            }
        }
        return function* (...args) {
            const goal = config.newGoal(...args)
            for (const solution of goal.solve()) {
                yield resolveSolution(args, solution)
            }
        }
    },
}

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
    query[configTag] = { ...config };

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

    query.findall = function (template, goal) {
        return findall(template, this(...goal))
    };

    return query;
}

export default {
    baseConfig,
    createTracer,
    createConfiguredQuery,
    scheduleRunnableGoals,
    predicatesTag,
    resolverTag,
    configTag,
    nameTag,
    runnableGoalsTag,
    generatedSourceTag,
    resolverTags,
    GoalSeries,
    unify,
    resolveSolution,
    ObjectPattern,
    ArrayPattern,
    _,
    Value,
}
