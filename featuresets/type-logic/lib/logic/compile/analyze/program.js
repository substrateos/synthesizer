import analyzeClauses from '@/lib/logic/compile/analyze/clauses';
import analyzeScopes from '@/lib/logic/compile/analyze/scopes';

/**
 * The main entry point for the entire analysis pass.
 * @param {object} ast - The raw AST from the parser.
 * @returns {object} An object containing the annotatedClauseMap and module info.
 */
export default function analyzeProgram(ast) {
    const isModule = ast.body.some(node => node.type === 'ExportNamedDeclaration');

    // Discover the program's structure and all clause definitions.
    const clauseMap = analyzeClauses(ast);

    // Resolve the lexical scope for every clause in the map.
    const annotatedClauseMap = analyzeScopes(clauseMap);

    return {
        annotatedClauseMap,
        isModule,
    };
}