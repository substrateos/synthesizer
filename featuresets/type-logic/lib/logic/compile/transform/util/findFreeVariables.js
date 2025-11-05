import { ancestor, simple } from "@/lib/logic/acorn-walk@8.3.4.js"

// A set of common JS globals to ignore.
const KNOWN_GLOBALS = new Set([
  "AbortController",
  "arguments", // not quite a global, but fine treat it as one
  "Array",
  "ArrayBuffer",
  "atob",
  "AudioContext",
  "Blob",
  "Boolean",
  "BigInt",
  "btoa",
  "cancelAnimationFrame",
  "clearInterval",
  "clearTimeout",
  "console",
  "crypto",
  "CustomEvent",
  "DataView",
  "Date",
  "decodeURI",
  "decodeURIComponent",
  "devicePixelRatio",
  "document",
  "encodeURI",
  "encodeURIComponent",
  "Error",
  "escape",
  "eval",
  "EventSource",
  "fetch",
  "File",
  "FileList",
  "FileReader",
  "Float32Array",
  "Float64Array",
  "Function",
  "globalThis",
  "Headers",
  "Image",
  "ImageData",
  "Infinity",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Intl",
  "isFinite",
  "isNaN",
  "JSON",
  "Map",
  "Math",
  "MessageChannel",
  "NaN",
  "Number",
  "navigator",
  "Object",
  "parseFloat",
  "parseInt",
  "performance",
  "Path2D",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "requestAnimationFrame",
  "Set",
  "self",
  "setInterval",
  "setTimeout",
  "String",
  "structuredClone",
  "Symbol",
  "SyntaxError",
  "TextDecoder",
  "TextEncoder",
  "this",
  "TypeError",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "undefined",
  "unescape",
  "URIError",
  "URL",
  "WeakMap",
  "WeakSet",
  "WebSocket",
  "Worker",
  "window"
]);

/**
 * Precisely finds only the identifiers that are being declared (bound)
 * within a destructuring pattern.
 * @param {Node} node The AST node for a declaration pattern.
 * @param {Set<string>} bindings A set to collect the names of the declared variables.
 * @returns {Set<string>} The set of declared variable names.
 */
function findBindingIdentifiers(node, bindings = new Set()) {
    if (!node) return bindings;

    switch (node.type) {
        case 'Identifier':
            bindings.add(node.name);
            break;
        case 'ObjectPattern':
            for (const prop of node.properties) {
                // For spread syntax `{ ...rest }`, the argument is the binding.
                // For a property `{ key: value }`, the binding is in the `value` part.
                const nodeToTraverse = prop.type === 'RestElement' ? prop.argument : prop.value;
                findBindingIdentifiers(nodeToTraverse, bindings);
            }
            break;
        case 'ArrayPattern':
            for (const element of node.elements) {
                // Recurse into array elements, skipping empty slots like in `[a,,b]`
                if (element) findBindingIdentifiers(element, bindings);
            }
            break;
        case 'RestElement':
            findBindingIdentifiers(node.argument, bindings);
            break;
        case 'AssignmentPattern': // Handles default values: { a = 1 }
            findBindingIdentifiers(node.left, bindings);
            break;
    }
    return bindings;
}

export default function findFreeVariables({ast}) {
    const freeVars = new Set();
    ancestor(ast, {
        Identifier(node, ancestors) {
            const name = node.name;
            const parent = ancestors[ancestors.length - 2];

            // Step 1: Ignore identifiers that are not variable references.
            if ((parent.type === 'MemberExpression' && parent.property === node && !parent.computed) ||
                (parent.type === 'Property' && parent.key === node && !parent.computed) ||
                (parent.type === 'VariableDeclarator' && parent.id === node) ||
                (parent.type.includes('Function') && parent.id === node) ||
                ((parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') && parent.id === node)) {
                return;
            }

            // Step 2: If it's a reference, check the scope chain to see if it's declared.
            let isDeclared = KNOWN_GLOBALS.has(name);
            if (isDeclared) return;

            for (let i = ancestors.length - 2; i >= 0 && !isDeclared; i--) {
                const ancestorNode = ancestors[i];

                // Check for function-level scope (name, params, and 'var' declarations)
                if (ancestorNode.type.includes('Function')) {
                    if ((ancestorNode.id && ancestorNode.id.name === name) ||
                        findBindingIdentifiers({ type: 'ArrayPattern', elements: ancestorNode.params }).has(name)) {
                        isDeclared = true;
                    } else {
                        simple(ancestorNode.body, {
                            VariableDeclaration(decl) {
                                if (decl.kind === 'var' && findBindingIdentifiers({ type: 'ArrayPattern', elements: decl.declarations.map(d => d.id) }).has(name)) {
                                    isDeclared = true;
                                }
                            }
                        });
                    }
                }

                // For `for (let i...)`, `for (const x of...)`, etc.
                if (['ForStatement', 'ForInStatement', 'ForOfStatement'].includes(ancestorNode.type)) {
                    const declarationNode = ancestorNode.init || ancestorNode.left;
                    if (declarationNode && declarationNode.type === 'VariableDeclaration' && declarationNode.kind !== 'var') {
                        for (const declarator of declarationNode.declarations) {
                            if (findBindingIdentifiers(declarator.id).has(name)) {
                                isDeclared = true;
                                break;
                            }
                        }
                    }
                }

                // For `catch (err) { ... }`
                if (ancestorNode.type === 'CatchClause') {
                    if (ancestorNode.param && findBindingIdentifiers(ancestorNode.param).has(name)) {
                        isDeclared = true;
                    }
                }

                // Check for block-level and top-level program scope.
                if (ancestorNode.type === 'BlockStatement' || ancestorNode.type === 'Program') {
                    for (const statement of ancestorNode.body) {
                        // Check for 'let' and 'const'
                        if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') {
                            for (const declarator of statement.declarations) {
                                if (findBindingIdentifiers(declarator.id).has(name)) {
                                    isDeclared = true;
                                    break;
                                }
                            }
                        }
                        // Also check for 'function' declarations
                        if (statement.type === 'FunctionDeclaration') {
                            if (statement.id && statement.id.name === name) {
                                isDeclared = true;
                                break;
                            }
                        }
                        // Also check for 'class' declarations
                        if (statement.type === 'ClassDeclaration') {
                            if (statement.id && statement.id.name === name) {
                                isDeclared = true;
                                break;
                            }
                        }
                        if (isDeclared) break;
                    }
                }
            }

            // Step 3: If no declaration was found, it's a free variable.
            if (!isDeclared) {
                freeVars.add(name);
            }
        }
    });

    return Array.from(freeVars);
}
