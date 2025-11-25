import { solve_constraints } from '@/logic/examples/kiwi/impl.js';

export function solve(vars, debug) {
    ({vars, debug} = Logic.js(solve_constraints({
        constraints: v => this.constraints(v),
        vars,
    })));
}
