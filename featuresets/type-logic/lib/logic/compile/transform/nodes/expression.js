import CallExpression from "@/lib/logic/compile/transform/nodes/expressions/CallExpression.js";
import UnaryExpression from "@/lib/logic/compile/transform/nodes/expressions/UnaryExpression.js";
import infixExpr from "@/lib/logic/compile/transform/exprs/infix.js";
import unifyExpr from "@/lib/logic/compile/transform/exprs/unify.js";

function extractLogicOptionalIfAny(node) {
    if (node.type !== 'CallExpression') {
        return null
    }
    if (node.callee.type !== 'MemberExpression') {
        return null
    }
    const namespace = node.callee.object.name;
    const method = node.callee.property.name;
    if (namespace !== 'Logic') {
        return null
    }

    if (method !== 'optional') {
        return null
    }

    if (node.arguments.length !== 1) {
        throw new Error("Logic.optional() requires exactly one argument")
    }

    return node.arguments[0]
}

// Helper to generate the code for a pattern constructor call
// Needs to be passed `transformExpression` for recursion
function _generatePattern(transformExpression, isObject, nodes, context) {
    const partsCode = [];
    let currentFixedCode = [];

    const pushFixed = () => {
        if (currentFixedCode.length === 0) return;
        if (isObject) {
            partsCode.push(`{${currentFixedCode.join(', ')}}`);
        } else {
            partsCode.push(`[${currentFixedCode.join(', ')}]`);
        }
        currentFixedCode = [];
    };

    let patternRequired = false;
    for (const node of nodes) {
        if (node.type === 'RestElement' || node.type === 'SpreadElement') {
            patternRequired = true;
            pushFixed();
            // Recursive call must be to transformExpression
            partsCode.push(transformExpression(node.argument, context));
        } else { // It's a fixed item
            let valueNode = isObject ? node.value : node;
            if (valueNode.type === 'AssignmentPattern') {
                patternRequired = true;
            }
            
            // Recursive call must be to transformExpression
            let valueCode = transformExpression(valueNode, context); 

            if (isObject) {
                // Handle computed property keys
                const keyNode = node.key;
                let key;
                if (keyNode.type === 'Identifier' && !node.computed) {
                    key = `'${keyNode.name}'`;
                } else if (keyNode.type === 'Literal') {
                    key = JSON.stringify(keyNode.value);
                } else {
                    // It's a computed property [X] or a complex expression
                    // We must ground it.
                    key = `[${transformExpression(keyNode, context)}]`;
                    // Computed properties force this to be a pattern
                    patternRequired = true; 
                }
                
                valueCode = `${key}: ${valueCode}`;
            }
            currentFixedCode.push(valueCode);
        }
    }
    pushFixed();

    if (patternRequired || partsCode.length > 1) {
        if (isObject) {
            return `ObjectPattern.from([${partsCode.join(', ')}], {isExact: true})`;
        }
        return `ArrayPattern.of(${partsCode.join(', ')})`;
    }
    return partsCode[0] || (isObject ? '{}' : '[]')
}

const InfixExpression = (transformExpression, node, context) => infixExpr({
    left: transformExpression(node.left, context),
    right: transformExpression(node.right, context),
    operator: node.operator,
    startLocation: context.getRawSourceLocation(node.start),
}, context)

const expressionTransformers = {
    Literal: (transformExpression, node, context) => JSON.stringify(node.value),
    
    ArrayExpression: (transformExpression, node, context) =>
        _generatePattern(transformExpression, false, node.elements, context),

    ArrayPattern: (transformExpression, node, context) =>
        _generatePattern(transformExpression, false, node.elements, context),

    ObjectExpression: (transformExpression, node, context) =>
        _generatePattern(transformExpression, true, node.properties, context),

    ObjectPattern: (transformExpression, node, context) =>
        _generatePattern(transformExpression, true, node.properties, context),
    
    AssignmentPattern: (transformExpression, node, context) => {
        const logicOptionalValue = extractLogicOptionalIfAny(node.right);
        if (logicOptionalValue) {
            return `Value.optional(${transformExpression(node.left, context)}, ${transformExpression(logicOptionalValue, context)})`;
        } else {
            return `Value.required(${transformExpression(node.left, context)}, ${transformExpression(node.right, context)})`;
        }
    },
    CallExpression,
    Identifier: (transformExpression, node, context) => {
        const resolution = context.scope.resolveName(node.name);
        if (resolution?.type === 'predicate') {
            const scopeDepth = resolution.scope.depth;
            let scopes = 'null';
            if (scopeDepth > 0) {
                // Slice the *runtime* 'scopes' array up to the parent level (resolution.scope.depth).
                // The runtime 'scopes' variable will hold the caller's scopes array.
                // The slice captures the array [globalData, ..., parent_of_definition_Data].
                scopes = `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;
            }
            return `${resolution.definition.mangledName}.bind(null, ${scopes})`;
        }

        // Fallback to a normal variable reference.
        if (node.name === '_') return `_`;
        return `vars.${node.name}`;
    },
    AssignmentExpression: (transformExpression, node, context) => {
        if (context.lhs) {
            throw new SyntaxError("chained assignments are not yet supported")
        }
        
        const lhsExpr = transformExpression(node.left, context);
        const rhsExpr = transformExpression(node.right, {...context, lhs: node.left});
    
        if (typeof rhsExpr === 'string') {
            return unifyExpr({
                left: lhsExpr,
                right: rhsExpr,
                startLocation: context.getRawSourceLocation(node.start)
            });
        } else {
            // For now assume that lhs has already been respected.
            return rhsExpr;
        }
    },
    UnaryExpression,
    BinaryExpression: InfixExpression,
    LogicalExpression: InfixExpression,
};

/**
 * @param {object} node - The AST node for the expression.
 * @param {ClauseInfo} context - The transformation context.
 * @returns {object} The IR node.
 */
export default function transformExpression(node, context) {
    const transformer = expressionTransformers[node.type];
    if (transformer) {
        return transformer(transformExpression, node, context);
    }    
    throw new Error(`Unsupported expression type: ${node.type}`);
}
