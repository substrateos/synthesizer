import { tokenizer, parse } from "@/lib/logic/acorn@8.15.0.js";

/**
 * Helper to parse a single import statement string and extract:
 * 1. The source path (module URL)
 * 2. The local names and how they map to imported exports.
 *
 * Returns: { source: string, specifiers: Array<{type, local, imported?}> }
 */
function parseImportDetails(importStatementRaw) {
    try {
        const ast = parse(importStatementRaw, { ecmaVersion: 2022, sourceType: 'module' });
        const node = ast.body[0]; // The ImportDeclaration
        
        if (node && node.type === 'ImportDeclaration') {
            const source = node.source.value; // The module path string
            const specifiers = [];

            if (node.specifiers) {
                for (const spec of node.specifiers) {
                    if (spec.type === 'ImportSpecifier') {
                        // import { a as b }
                        specifiers.push({ 
                            type: 'named', 
                            imported: spec.imported.name, // 'a'
                            local: spec.local.name        // 'b'
                        });
                    } else if (spec.type === 'ImportDefaultSpecifier') {
                        // import A
                        specifiers.push({ 
                            type: 'default', 
                            local: spec.local.name 
                        });
                    } else if (spec.type === 'ImportNamespaceSpecifier') {
                        // import * as N
                        specifiers.push({ 
                            type: 'namespace', 
                            local: spec.local.name 
                        });
                    }
                }
            }
            return { source, specifiers };
        }
    } catch (e) {
        // Ignore syntax errors in snippets, handled later.
    }
    return { source: null, specifiers: [] };
}

/**
 * Masks import and export statements in the source code with whitespace,
 * preserving the exact line/column offsets for the rest of the code.
 *
 * @param {string} source - The module source code.
 * @returns {object} { maskedSource, imports, exports }
 */
function maskModuleSource(source) {
    const imports = [];
    const exports = [];
    let masked = source.split(''); // Mutable char array
    
    // Helper to replace a range with spaces
    const maskRange = (start, end) => {
        for (let i = start; i < end; i++) {
            if (masked[i] !== '\n') masked[i] = ' ';
        }
    };

    const tokens = tokenizer(source, { ecmaVersion: 2022, sourceType: 'module' });
    let token = tokens.getToken();

    while (token.type.label !== 'eof') {
        if (token.type.keyword === 'import') {
            const start = token.start;
            
            // Scan forward until semicolon
            let statementEnd = token.end;
            while (token.type.label !== 'eof' && token.type.label !== ';') {
                token = tokens.getToken();
                statementEnd = token.end;
            }
            
            if (token.type.label === 'eof') statementEnd = source.length;
            
            const raw = source.slice(start, statementEnd);
            imports.push({ start, end: statementEnd, raw });
            maskRange(start, statementEnd);

        } else if (token.type.keyword === 'export') {
            const start = token.start;
            maskRange(start, token.end); // Mask 'export' keyword
            
            token = tokens.getToken(); 

            if (token.type.keyword === 'default') {
                maskRange(token.start, token.end); // Mask 'default'
                token = tokens.getToken();
                
                if (token.type.keyword === 'function') {
                    let nameToken = tokens.getToken();
                    if (nameToken.type.label === 'name') {
                        exports.push({ type: 'default', name: nameToken.value });
                    }
                }
            } else if (token.type.keyword === 'function') {
                let nameToken = tokens.getToken();
                if (nameToken.type.label === 'name') {
                    exports.push({ type: 'named', name: nameToken.value });
                }
            } else if (token.type.label === '{' || token.type.label === '*') {
                // Mask export { ... } or export *
                let statementEnd = token.end;
                while (token.type.label !== 'eof' && token.type.label !== ';') {
                    token = tokens.getToken();
                    statementEnd = token.end;
                }
                if (token.type.label === 'eof') statementEnd = source.length;
                maskRange(start, statementEnd);
            }
        }

        if (token.type.label !== 'eof') {
            token = tokens.getToken();
        }
    }
    
    return { maskedSource: masked.join(''), imports, exports };
}

export default function parseLogic(source) {
    const { maskedSource, imports, exports } = maskModuleSource(source);
    const ast = parse(maskedSource, { ecmaVersion: 2022, sourceType: 'script' });

    // Enrich imports with parsed details
    const enrichedImports = imports.map(imp => {
        const details = parseImportDetails(imp.raw);
        return {
            ...imp,
            ...details
        };
    });

    return { ast, imports: enrichedImports, exports };
}