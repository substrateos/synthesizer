import DFS from "@/lib/logic/schedulers/DFS";

export default function GoalSeries({nextID=1, defaultSchedulerClass=DFS, defaultTracer}={}) {
    // A "Goal" is a context object for a single query instance (e.g., `path(X, 'd')`).
    // It tracks the overall state for that query, including solutions found, and
    // pending work (choice points/forks).
    return class Goal {
        constructor({parent, key, resolver, args, scheduler, tracer}) {
            this.id = nextID++
            this.resolver = resolver
            this.args = args
            this.generator = resolver.apply(null, args)
            this.tracer = tracer || defaultTracer

            this.scheduler = scheduler || new defaultSchedulerClass()
            this.subgoals = new Map()
            this.isComplete = false
            this.solutionsFound = 0

            this.parent = parent
            this.key = key

            // A "task" is a single unit of work for a resolver.
            // It represents one attempt to advance one possible proof path.
            // The first time a path is tried, we don't have a solution, or feedback, or a resume token.
            this.scheduler.add({})
        }

        schedule(task) {
            this.scheduler.add(task)
        }

        scheduleAll(tasks) {
            this.scheduler.addAll(tasks)
        }

        // Marks a goal as complete, preventing any further work and discarding pending steps.
        completed() {
            if (this.isComplete) return;
            this.isComplete = true;

            this.generator.return()

            this.scheduler.clear();

            // Recursively complete all of its own sub-goals.
            for (const subgoal of this.subgoals.values()) {
                subgoal.completed()
            }
            this.subgoals.clear();
        }

        next() {
            const task = this.scheduler.next()
            if (task) {
                const nextResult = this.generator.next(task);
                this.tracer?.(this, 'REDO', task);
                return nextResult.done ? { type: 'fail' } : nextResult.value;
            }
            return undefined
        }

        subgoalCall(resume, resolver, args, tracer) {
            const key = Symbol()
            const subgoal = new Goal({ parent: this, key, resolver, args, tracer: tracer || this.tracer});
            this.subgoals.set(key, subgoal);
            this.resumeForSubgoalSolution = resume
            return subgoal
        }

        subgoalRedo(resume, key) {
            const subgoal = this.subgoals.get(key);
            // update our resume token, then switch to subgoal
            this.resumeForSubgoalSolution = resume;
            if (!subgoal || subgoal.isComplete) {
                return this.#resumeWithSubgoalSolution(subgoal, undefined)
            } else {
                return subgoal;
            }
        }

        subgoalDone(resume, key) {
            const subgoal = this.subgoals.get(key);
            if (subgoal && !subgoal.isComplete) {
                subgoal.completed();
                this.subgoals.delete(key);
            }
            this.schedule({ resume });
            return this
        }

        notifySolution(resume, solution) {
            if (resume) {
                this.scheduler({ resume })
            } else if (!solution && !this.scheduler.size()) {
                this.completed()
            }

            return this.parent.#resumeWithSubgoalSolution(this, solution)
        }

        #resumeWithSubgoalSolution(subgoal, subgoalSolution) {
            if (!this.resumeForSubgoalSolution) {
                throw new Error("internal error: cannot resume a this without a resume key")
            }

            let subgoalRedoKey
            if (subgoal.isComplete) {
                // remove the completed subgoal from the parent
                this.subgoals.delete(subgoal.key)
            } else {
                subgoalRedoKey = subgoal.key
            }

            this.scheduler.add({resume: this.resumeForSubgoalSolution, subgoalSolution, subgoalRedoKey})
            this.resumeForSubgoalSolution = undefined
            return this
        }

        *solve() {
            let goal = this

            while (true) {
                let signal

                // A resolver generator should always yield a signal. If the goal is complete, or the generator terminates, its path has failed.
                if (goal.isComplete) {
                    signal = { type: 'fail' }
                } else {
                    signal = goal.next()
                    if (!signal) {
                        if (goal.parent) {
                            goal = goal.notifySolution(undefined, undefined)
                            continue
                        } else {
                            break
                        }
                    }
                }

                switch (signal.type) {
                    case 'call': {
                        switch (signal.op || 'call') {
                            case 'call': { // The resolver needs a solution from a subgoal.
                                const {resume, resolver, goal: args, tracer} = signal;
                                goal = goal.subgoalCall(resume, resolver, args, tracer)
                                break;
                            }
                            case 'redo': { // signal should have {key, resume}
                                const {resume, key} = signal
                                goal = goal.subgoalRedo(resume, key)
                                break;
                            }
                            case 'done': {
                                const {resume, key} = signal
                                goal = goal.subgoalDone(resume, key);
                                break;
                            }
                        }
                        break;
                    }

                    case 'fork': { // The resolver found multiple alternative paths.
                        const {forks} = signal
                        goal.scheduleAll(forks)
                        break;
                    }

                    case 'exit': { // The resolver has found a solution
                        const {solution, resume, feedback: feedbackToken} = signal
                        goal.solutionsFound++;
                        goal.tracer?.(goal, 'EXIT', solution);

                        if (goal.parent) {
                            // If this was a sub-goal, resume its parent with the solution.
                            goal = goal.notifySolution(resume, solution)
                        } else {
                            // This is a top-level solution. Yield it to the user.
                            const outcome = yield solution;

                            // If more solutions might exist for this path, schedule the next one.
                            if (resume) {
                                goal.schedule({ resume });
                            }

                            // If the user sends back feedback, schedule a task to deliver it.
                            if (outcome && feedbackToken) {
                                goal.schedule({
                                    resume: feedbackToken,
                                    solution,
                                    outcome,
                                });
                            }
                        }
                        break;
                    }

                    case 'fail': {
                        goal.tracer?.(goal, 'FAIL');
                        break;
                    }
                }
            }
        }
    }
}
