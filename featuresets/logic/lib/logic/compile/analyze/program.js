import findDeclaredVariables from "@/lib/logic/compile/analyze/util/findDeclaredVariables.js";
import findDeclaredFunctions from "@/lib/logic/compile/analyze/util/findDeclaredFunctions.js";
import positionTracker from "@/lib/logic/compile/analyze/util/positionTracker.js";
import mangleName from "@/lib/logic/compile/analyze/util/mangleName.js";
import mangleImport from "@/lib/logic/compile/analyze/util/mangleImport.js";

function analyzeScope(astNode, parentScope, parentPath = [], addExtraClauseProps, declaredImports = new Map()) {
    const declaredPredicateFuncs = findDeclaredFunctions(astNode);
    const declaredPredicateFuncEntries = Object.entries(Object.groupBy(declaredPredicateFuncs, funcNode => funcNode.id.name))
    const depth = parentPath.length

    const currentScope = {
        parentScope,
        astNode,
        depth,
        declaredVariables: findDeclaredVariables(astNode),
        declaredImports, // Populated for top-level
        
        declaredPredicates: new Map(declaredPredicateFuncEntries.map(([name]) => [name, {mangledName: mangleName([...parentPath, name])}])),
        
        resolveName(name) {
            if (this.declaredVariables.has(name)) {
                return { scope: this, type: 'variable', node: this.declaredVariables.get(name) };
            }
            if (this.declaredPredicates.has(name)) {
                return { scope: this, type: 'predicate', definition: this.declaredPredicates.get(name) };
            }
            if (this.declaredImports.has(name)) {
                 return { 
                     scope: this, 
                     type: 'imported', 
                     definition: this.declaredImports.get(name) 
                 }
            }
            return this.parentScope?.resolveName(name);
        },
    };

    currentScope.declaredPredicates = new Map(declaredPredicateFuncEntries.map(([name, funcNodes]) => {
        const currentPath = [...parentPath, name];
        const mangledName = mangleName(currentPath)
        return [name, {
            name,
            mangledName,
            depth,
            shadows: parentScope?.resolveName(name)?.definition?.mangledName,
            clauses: funcNodes.map(funcNode => addExtraClauseProps({
                astNode: funcNode,
                scope: analyzeScope(funcNode, currentScope, currentPath, addExtraClauseProps),
            })),
        }];
    }));

    return currentScope
}

export default function analyzeProgram(ast, sourceCode, imports = [], parserExports = []) {
    const getRawSource = (node) => {
        if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') {
            throw new Error("Invalid AST node passed to getRawSource.");
        }
        return sourceCode.slice(node.start, node.end);
    };

    const getRawSourceLocation = positionTracker(sourceCode)
    
    // Create the authoritative map of import names
    const declaredImports = new Map();
    for (const imp of imports) {
        for (const spec of imp.specifiers) {
            declaredImports.set(spec.local, {
                localName: spec.local,
                mangledName: mangleImport(spec.local)
            });
        }
    }

    const topLevelScope = analyzeScope(ast, null, [], clauseProps => ({
        ...clauseProps,
        getRawSource,
        getRawSourceLocation,
        get astNodeSource() { return this.getRawSource(this.astNode) },
    }), declaredImports);

    // Determine Module Status based on Parser Metadata.
    // We cannot check the AST for Import/Export nodes because they were masked (replaced with whitespace).
    const isModule = imports.length > 0 || parserExports.length > 0;

    // Normalize Exports.
    // If we are in Script Mode (not a module), we implicitly export ALL top-level predicates.
    // If we are in Module Mode, we only use the explicit parserExports.
    let finalExports = parserExports;
    if (!isModule) {
        finalExports = Array.from(topLevelScope.declaredPredicates.keys()).map(name => ({
            type: 'named',
            name
        }));
    }

    return {
        topLevelScope,
        isModule,
        exports: finalExports
    };
}
