import CallExpression from "@/lib/logic/compile/transform/nodes/expressions/CallExpression.js";
import UnaryExpression from "@/lib/logic/compile/transform/nodes/expressions/UnaryExpression.js";
import infixExpr from "@/lib/logic/compile/transform/exprs/infix.js";
import unifyExpr from "@/lib/logic/compile/transform/exprs/unify.js";

function extractLogicOptionalIfAny(node) {
    if (node.type !== 'CallExpression') return null;
    if (node.callee.type !== 'MemberExpression') return null;
    if (node.callee.object.name !== 'Logic' || node.callee.property.name !== 'optional') return null;
    if (node.arguments.length !== 1) throw new Error("Logic.optional() requires exactly one argument");
    return node.arguments[0];
}

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
            partsCode.push(transformExpression(node.argument, context));
        } else {
            let valueNode = isObject ? node.value : node;
            if (valueNode.type === 'AssignmentPattern') patternRequired = true;
            
            let valueCode = transformExpression(valueNode, context); 

            if (isObject) {
                const keyNode = node.key;
                let key;
                if (keyNode.type === 'Identifier' && !node.computed) {
                    key = `'${keyNode.name}'`;
                } else if (keyNode.type === 'Literal') {
                    key = JSON.stringify(keyNode.value);
                } else {
                    key = `[${transformExpression(keyNode, context)}]`;
                    patternRequired = true; 
                }
                valueCode = `${key}: ${valueCode}`;
            }
            currentFixedCode.push(valueCode);
        }
    }
    pushFixed();

    if (patternRequired || partsCode.length > 1) {
        if (isObject) return `ObjectPattern.from([${partsCode.join(', ')}], {isExact: true})`;
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
    ArrayExpression: (transformExpression, node, context) => _generatePattern(transformExpression, false, node.elements, context),
    ArrayPattern: (transformExpression, node, context) => _generatePattern(transformExpression, false, node.elements, context),
    ObjectExpression: (transformExpression, node, context) => _generatePattern(transformExpression, true, node.properties, context),
    ObjectPattern: (transformExpression, node, context) => _generatePattern(transformExpression, true, node.properties, context),
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
        
        if (resolution?.type === 'imported') {
            // Reference the MANGLED name from the analysis definition.
            // In Logic context, unwrap it.
            return `${resolution.definition.mangledName}[resolverTag]`;
        }

        if (resolution?.type === 'predicate') {
            const scopeDepth = resolution.scope.depth;
            let scopes = 'null';
            if (scopeDepth > 0) {
                scopes = `scopes.length === ${scopeDepth - 1} ? [...scopes, {vars, bindings}] : scopes.slice(0, ${scopeDepth + 1})`;
            }
            return `${resolution.definition.mangledName}.bind(null, ${scopes})`;
        }

        if (node.name === '_') return `_`;
        return `vars.${node.name}`;
    },
    AssignmentExpression: (transformExpression, node, context) => {
        if (context.lhs) throw new SyntaxError("chained assignments are not yet supported");
        const lhsExpr = transformExpression(node.left, context);
        const rhsExpr = transformExpression(node.right, {...context, lhs: node.left});
        if (typeof rhsExpr === 'string') {
            return unifyExpr({
                left: lhsExpr,
                right: rhsExpr,
                startLocation: context.getRawSourceLocation(node.start)
            });
        }
        return rhsExpr;
    },
    UnaryExpression,
    BinaryExpression: InfixExpression,
    LogicalExpression: InfixExpression,
};

export default function transformExpression(node, context) {
    const transformer = expressionTransformers[node.type];
    if (transformer) return transformer(transformExpression, node, context);
    throw new Error(`Unsupported expression type: ${node.type}`);
}