import {solve} from "@/logic/examples/kiwi/solver.logic.js";

export default function run_constraint_system(Source, Vars, Debug) {
    // Compile the ephemeral "System" logic from the string.
    var SystemPredicate = Logic.compile(Source);

    // Apply the system constraints to the variables.
    SystemPredicate(Vars);

    // Run the Kiwi solver, unifying internals with Debug.
    solve(Vars, Debug);
}