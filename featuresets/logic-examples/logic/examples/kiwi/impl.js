import {
    Constraint,
    Expression,
    Operator,
    Solver,
    Variable,
} from '@/logic/examples/kiwi/@lume/kiwi@0.4.4/kiwi.js';
import logic from "@/lib/logic/logic.js";

const EPSILON = 0.001;

function crawlConstraints(getConstraints, vars) {
    const visitedVars = new Set();
    const constraints = new Set();
    const queue = [...vars];

    while (queue.length > 0) {
        const v = queue.shift();
        if (typeof v !== 'symbol') continue;
        if (visitedVars.has(v)) continue;
        visitedVars.add(v);

        const varConstraints = getConstraints(v);
        for (const constr of varConstraints) {
            if (constraints.has(constr)) continue;
            constraints.add(constr);
            for (const arg of constr.args) {
                if (typeof arg === 'symbol' && !visitedVars.has(arg)) {
                    queue.push(arg);
                }
            }
        }
    }
    return constraints;
}

class VarTable {
    #vars = new Map();
    #varId = 0;

    get(sym) {
        if (typeof sym === 'number') return sym;
        if (!this.#vars.has(sym)) {
            const desc = sym.description || 'Var';
            const name = `${desc}_${this.#varId++}`;
            this.#vars.set(sym, new Variable(name));
        }
        return this.#vars.get(sym);
    };

    inspect() {
        const dump = {};
        for (const [sym, v] of this.#vars.entries()) {
            dump[v.name()] = { value: v.value(), symbol: sym.description };
        }
        return dump;
    }
}

class KiwiBridge {
    #vars = new VarTable();
    #solver = new Solver();
    #added = [];
    #scope = new Map(); // Maps AST Param Name -> Resolved Value

    visitConstraint({ fn, args }) {
        const fnStr = fn.toString();
        let ast;
        
        try {
            const result = logic.parse(fnStr)
            ast = result.ast;
        } catch (e) {
            console.warn("[Solver] Failed to parse constraint source:", fnStr);
            return false;
        }

        const arrow = ast.body.find(node => node.type === 'ExpressionStatement')?.expression;
        if (!arrow || arrow.type !== 'ArrowFunctionExpression') return false;

        // Map Parameters to Arguments
        // Note: 'args' are already resolved by unify.constraints()
        this.#scope.clear();
        arrow.params.forEach((param, i) => {
            if (param.type === 'Identifier') {
                this.#scope.set(param.name, args[i]);
            }
        });

        return this.buildConstraint(arrow.body, fnStr);
    }

    buildConstraint(node, source) {
        if (node.type !== 'BinaryExpression') return false;

        const op = node.operator;
        if (['>', '>=', '<', '<=', '==', '==='].includes(op)) {
            try {
                const leftExpr = this.buildExpression(node.left);
                const rightExpr = this.buildExpression(node.right);
                
                const diff = leftExpr.minus(rightExpr); 

                let constraint;
                switch (op) {
                    case '>':   constraint = new Constraint(diff, Operator.Ge, EPSILON); break;
                    case '>=':  constraint = new Constraint(diff, Operator.Ge); break;
                    case '<':   constraint = new Constraint(diff, Operator.Le, -EPSILON); break;
                    case '<=':  constraint = new Constraint(diff, Operator.Le); break;
                    case '===':
                    case '==':  constraint = new Constraint(diff, Operator.Eq); break;
                }
                this.#solver.addConstraint(constraint);
                this.#added.push({ source, kiwi: constraint.toString() });
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    buildExpression(node) {
        if (node.type === 'Identifier') {
            const sym = this.#scope.get(node.name);
            if (sym === undefined) throw new Error(`Unknown identifier: ${node.name}`);
            // Sym is already resolved (Symbol or Number)
            const term = this.#vars.get(sym); 
            return new Expression(term);
        }

        if (node.type === 'Literal') {
            return new Expression(node.value);
        }

        if (node.type === 'BinaryExpression') {
            const left = this.buildExpression(node.left);
            const right = this.buildExpression(node.right);
            
            switch (node.operator) {
                case '+': return left.plus(right);
                case '-': return left.minus(right);
                case '*': return left.multiply(right);
                case '/': return left.divide(right);
                default: throw new Error(`Unsupported arithmetic operator: ${node.operator}`);
            }
        }
        
        if (node.type === 'UnaryExpression' && node.operator === '-') {
            return this.buildExpression(node.argument).multiply(-1);
        }
        
        throw new Error(`Unsupported expression node: ${node.type}`);
    }

    solve() { this.#solver.updateVariables(); }

    value(sym) {
        if (typeof sym !== 'symbol') return sym;
        return this.#vars.get(sym).value();
    }

    inspect() {
        return {
            variables: this.#vars.inspect(),
            constraints: this.#added
        };
    }
}

/**
 * Main Entry Point called by the Logic wrapper.
 */
export function solve_constraints({ constraints: getConstraints, vars: startVars }) {
    const constraints = crawlConstraints(getConstraints, startVars);

    const bridge = new KiwiBridge();

    for (const constraint of constraints) {
        if (!bridge.visitConstraint(constraint)) {
            return null; // Fail on parse error
        }
    }

    try {
        bridge.solve();
    } catch (e) {
        console.warn('error during solve', e)
        return null;
    }

    // Returns an array of numbers corresponding to the input 'startVars'
    return {
        vars: startVars.map(v => bridge.value(v)),
        debug: bridge.inspect(),
    }
}
