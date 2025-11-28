import { nameTag } from "@/lib/logic/tags.js"
import unify from "@/lib/logic/unify.js";

/**
 * A specialized stateless generator that drains a queue of previously deferred (but now runnable) goals.
 * Uses the resume-token pattern to support full backtracking without intermediate forks.
 */
export default function* scheduleRunnableGoals() {
    // we need an initial yield. expect to resume with {} and callerBindings.
    let yieldValue = { type: 'fork', forksNeedBindings: true, forks: [{resume: {}}] }
    while (true) {
        const step = yield yieldValue;
        let { pc, oppc, bindings, goals, goalIndex } = step.resume ?? {};
        yieldValue = undefined;

        switch (pc) {
            case undefined: {
                // Use bindings from the caller (the Goal that invoked us)
                bindings = step.callerBindings;
                goals = [];
                goalIndex = 0;
                pc = 0;
                // fallthrough
            }
            case 0: { // STATE: CHECK FOR WORK
                // If the current batch is exhausted (or empty initially), check mailbox.
                if (goalIndex >= goals.length) {
                    const claim = unify.claimRunnableGoals(bindings);
                    if (!claim) {
                        // Completely done.
                        yieldValue = { type: 'exit', solution: bindings };
                        continue;
                    }

                    bindings = claim.bindings;
                    goals = claim.goals;
                    goalIndex = 0;
                }

                pc = 1;
                // fallthrough
            }
            case 1: { // STATE: EXECUTE GOAL
                // oppc handles the "Call Return" sub-states:
                // undefined: Initial Call
                // 0: Redo Request
                // 1: Return from Call

                switch (oppc) {
                    case undefined: {
                        const {resolver, args, location} = goals[goalIndex];
                        yieldValue = {
                            type: 'call',
                            op: 'call',
                            resolver,
                            goal: args,
                            resume: { bindings, goals, goalIndex, pc, oppc: 1 },
                            bindings,
                            location,
                        };
                        continue
                    }
                    case 0: {
                        yieldValue = {
                            type: 'call',
                            op: 'redo',
                            key: step.resume.subgoalRedoKey,
                            resume: { bindings, goals, goalIndex, pc, oppc: 1 },
                            location: goals[goalIndex].location,
                        };
                        continue
                    }
                    case 1: {
                        const {subgoalSolution, subgoalRedoKey} = step
                        if (subgoalSolution) {
                            yieldValue = {
                                type: 'fork',
                                // If the subgoal has more solutions, include them in forks.
                                forks: subgoalRedoKey
                                    ? [{
                                        // We resume at PC 1 with oppc=0 to trigger the redo logic above.
                                        // Note: We use the *original* bindings here, as we are re-trying the same step.
                                        resume: { bindings, goals, goalIndex, subgoalRedoKey, pc, oppc: 0 }
                                    }]
                                    : undefined,
                                resume: {
                                    pc: 0,
                                    bindings: unify.mergeBindings(bindings, subgoalSolution),
                                    goals,
                                    goalIndex: goalIndex + 1,
                                },
                            }
                            continue
                        } else {
                            // Subgoal Failed. The entire branch fails.
                            yieldValue = { type: 'fail' };
                            continue
                        }
                    }
                }
                break;
            }
        }
    }
}

scheduleRunnableGoals[nameTag] = `runtime/scheduleRunnableGoals`
