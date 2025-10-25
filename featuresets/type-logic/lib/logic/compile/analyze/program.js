import findDeclaredVariables from '@/lib/logic/compile/analyze/util/findDeclaredVariables';
import findDeclaredFunctions from '@/lib/logic/compile/analyze/util/findDeclaredFunctions';
import mangleName from '@/lib/logic/compile/analyze/util/mangleName';

function analyzeScope(astNode, parentScope, parentPath = [], extraClauseProps) {
    const declaredPredicateFuncs = findDeclaredFunctions(astNode);
    const declaredPredicateFuncEntries = Object.entries(Object.groupBy(declaredPredicateFuncs, funcNode => funcNode.id.name))
    const depth = parentPath.length

    const currentScope = {
        parentScope,
        astNode,
        depth,
        declaredVariables: findDeclaredVariables(astNode),
        // Start with an bare initial Map so resolveName delegates to parentScope when we are building the real declaredPredicates below.
        declaredPredicates: new Map(declaredPredicateFuncEntries.map(([name]) => [name, {mangledName: mangleName([...parentPath, name])}])),
        resolveName(name) {
            if (this.declaredVariables.has(name)) {
                return {
                    scope: this,
                    type: 'variable',
                    node: this.declaredVariables.get(name)
                };
            }
            if (this.declaredPredicates.has(name)) {
                return {
                    scope: this,
                    type: 'predicate',
                    definition: this.declaredPredicates.get(name)
                };
            }
            return this.parentScope?.resolveName(name);
        },
    };

    // Calculate declaredPredicates all at once and overwrite the empty Map with a populated one so shadows calculations work properly.
    currentScope.declaredPredicates = new Map(declaredPredicateFuncEntries.map(([name, funcNodes]) => {
        const currentPath = [...parentPath, name];
        const mangledName = mangleName(currentPath)
        return [name, {
            name,
            mangledName,
            depth,
            shadows: parentScope?.resolveName(name)?.definition?.mangledName,
            clauses: funcNodes.map(funcNode => ({
                astNode: funcNode,
                scope: analyzeScope(funcNode, currentScope, currentPath, extraClauseProps),
                ...extraClauseProps,
            })),
        }];
    }));

    return currentScope
}

export default function analyzeProgram(ast, sourceCode) {
    const getRawSource = (node) => {
        if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') {
            throw new Error("Invalid AST node passed to getRawSource.");
        }
        return sourceCode.slice(node.start, node.end);
    };

    return {
        topLevelScope: analyzeScope(ast, null, [], {getRawSource}),
        isModule: ast.body.some(node => node.type === 'ExportNamedDeclaration'),
    };
}