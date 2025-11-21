import { ground } from "@/lib/logic/unify.js";
import Trace from "@/lib/logic/unify/Trace.js";

/**
 * Eagerly collects all solutions from a query, optionally shaping them
 * using a template.
 *
 * Overloads:
 * 1. findall(query) -> Array<SolutionObject>
 * Returns the raw solution objects (maps of variables).
 *
 * 2. findall(template, query) -> Array<TemplateInstance>
 * Returns an array where each item is a copy of 'template'
 * populated with data from a solution.
 *
 * @param {object|Iterable} arg1 - The template OR the query (if no template).
 * @param {Iterable} [arg2] - The query (if a template was provided).
 * @returns {Array|Promise<Array>}
 */
export default function findall(arg1, arg2) {
    let templateStructure = undefined;
    let query = undefined;

    // 1. Detect Overloads
    // Check if arg1 is the iterator/asyncIterator (meaning no template provided)
    if (arg1 && (typeof arg1[Symbol.iterator] === 'function' || typeof arg1[Symbol.asyncIterator] === 'function')) {
        query = arg1;
    } else {
        templateStructure = arg1;
        query = arg2;
    }

    if (!query) {
        throw new Error("logic.findall requires a query iterator (from logic.solve or logic.solveAsync).");
    }

    // 2. Helper to prepare binding context for 'ground'
    // We only need this if a templateStructure is provided.
    const toBindingContext = (flatSolution) => {
        const context = {};
        const symbols = Object.getOwnPropertySymbols(flatSolution);
        for (const sym of symbols) {
            context[sym] = { value: flatSolution[sym], trace: Trace.empty };
        }
        return context;
    };

    // 3. Handle Async Queries
    if (typeof query[Symbol.asyncIterator] === 'function') {
        return (async () => {
            const results = [];
            for await (const solution of query) {
                if (templateStructure !== undefined) {
                    results.push(ground(templateStructure, toBindingContext(solution)));
                } else {
                    results.push(solution);
                }
            }
            return results;
        })();
    }

    // 4. Handle Sync Queries
    if (typeof query[Symbol.iterator] === 'function') {
        const results = [];
        for (const solution of query) {
            if (templateStructure !== undefined) {
                results.push(ground(templateStructure, toBindingContext(solution)));
            } else {
                results.push(solution);
            }
        }
        return results;
    }

    throw new Error("logic.findall query argument must be an iterable or async iterable.");
}