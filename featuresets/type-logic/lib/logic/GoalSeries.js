import DFS from "@/lib/logic/schedulers/DFS";
import {configTag} from "@/lib/logic/tags"

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
            this.notify = undefined
            this.depth = parent ? parent.depth + 1 : 0
            this.scheduledTasks = 0
            this.pausedTasks = []
            this.key = key

            // A "task" is a single unit of work for a resolver.
            // It represents one attempt to advance one possible proof path.
            // The first time a path is tried, we don't have a solution, or feedback, or a resume token.
            this.schedule({trace: "CALL"})
        }

        schedule(task) {
            this.scheduler.add({goal: this, task})
            this.scheduledTasks++
        }

        scheduleAll(tasks) {
            this.scheduler.addAll(tasks.map(task => ({goal: this, task})))
            this.scheduledTasks += tasks.length
        }

        pauseTasks() {
            if (this.pausedTasks || this.isComplete) return;

            const all = new Set()
            const findAllSubgoals = (goal) => {
                if (all.has(goal)) {
                    return
                }
                if (!goal.pausedTasks) {
                    all.add(goal)
                }
                for (const subgoal of goal.subgoals.values()) {
                    findAllSubgoals(subgoal)
                }
            }
            findAllSubgoals(this)

            const paused = this.scheduler.pause(task => all.has(task.goal))
            for (const task of paused) {
                const goal = task.goal;
                goal.scheduledTasks--;
            }
            this.pausedTasks = paused;

            for (const goal of all) {
                if (goal.scheduledTasks !== 0) {
                    throw new Error(`paused but have ${goal.scheduledTasks} tasks unaccounted for on a goal`)
                }
            }
        }

        resumeTasks() {
            if (!this.pausedTasks) {
                return this
            }

            const tasks = this.pausedTasks
            this.pausedTasks = undefined

            if (tasks.length > 0) {
                this.scheduler.resume(tasks)
                for (const task of tasks) {
                    task.goal.scheduledTasks++
                }
            }
        }

        continueAsSubgoal(notify) {
            if (this.notify) {
                throw new Error("internal error: already have a notify value for this subgoal")
            }
            this.notify = notify
            this.resumeTasks()
            return this
        }

        checkCompleted() {
            if (this.isComplete) return true;

            if (this.scheduledTasks > 0) {
                return false
            }

            let subgoalsCompleted = true
            for (const subgoal of this.subgoals.values()) {
                if (!subgoal.checkCompleted()) {
                    subgoalsCompleted = false
                }
            }

            if (subgoalsCompleted) {
                this.completed()
                return true
            }

            return false
        }

        // Marks a goal as complete, preventing any further work and discarding pending steps.
        completed() {
            if (this.isComplete) return;
            this.isComplete = true;

            // first pause, then mark completed
            this.pauseTasks()

            this.generator.return()

            // Recursively complete all of its own sub-goals.
            for (const subgoal of this.subgoals.values()) {
                subgoal.completed()
            }
            this.subgoals.clear();
        }

        #subgoalSchedule(resume, subgoal) {
            const notify = {goal: this, resume}
            if (subgoal.scheduler === this.scheduler) {
                // if the scheduler is the same, put our notify details in
                subgoal.continueAsSubgoal(notify)
            } else {
                // if the subgoal uses a different scheduler, then we use our scheduler to decide when to delegate to its scheduler
                // but don't set its notify until we get there
                this.schedule({subgoal, notify})
            }
        }

        #resumeWithSubgoalSolution(resumeForSubgoalSolution, subgoal, subgoalSolution) {
            let subgoalRedoKey
            if (subgoal.isComplete) {
                // remove the completed subgoal from the parent
                this.subgoals.delete(subgoal.key)
            } else {
                subgoalRedoKey = subgoal.key
            }

            this.schedule({resume: resumeForSubgoalSolution, subgoalSolution, subgoalRedoKey})
        }

        subgoalCall(resume, resolver, args, tracer) {
            const key = Symbol()
            const schedulerClass = resolver[configTag]?.schedulerClass
            const scheduler = schedulerClass ? new schedulerClass() : this.scheduler
            const subgoal = new Goal({ parent: this, key, resolver, scheduler, args, tracer: tracer || this.tracer });
            this.subgoals.set(key, subgoal);
            this.#subgoalSchedule(resume, subgoal)
        }

        subgoalRedo(resume, key) {
            const subgoal = this.subgoals.get(key);
            subgoal.tracer?.(subgoal, 'REDO')
            // update our resume token, then switch to subgoal
            if (!subgoal || subgoal.isComplete) {
                subgoal.tracer?.(subgoal, 'FAIL')
                this.#resumeWithSubgoalSolution(resume, subgoal, undefined)
            } else {
                this.#subgoalSchedule(resume, subgoal)
            }
        }

        subgoalDone(resume, key) {
            const subgoal = this.subgoals.get(key);
            if (subgoal && !subgoal.isComplete) {
                subgoal.completed();
                this.subgoals.delete(key);
            }
            this.schedule({resume})
        }

        notifySolution(resume, solution) {
            if (resume) {
                this.schedule({ resume })
            } else {
                this.checkCompleted()
            }

            this.pauseTasks()
            const {goal: parentGoal, resume: parentResume} = this.notify
            this.notify = undefined
            parentGoal.#resumeWithSubgoalSolution(parentResume, this, solution)
            return parentGoal
        }

        *solve() {
            let goal = this

            while (true) {
                let signal
                let task

                ({goal, task} = (goal.scheduler.next() ?? {goal}));
                
                if (task) {
                    goal.scheduledTasks--;
                    if (task.subgoal) {
                        // switch to the goal it's for
                        goal = task.subgoal
                        goal.continueAsSubgoal(notify)
                        continue
                    }

                    if (task.trace) {
                        goal?.tracer?.(goal, task.trace)
                    }

                    // if it's our own task, do it
                    const nextResult = goal.generator.next(task);
                    if (nextResult.done) {
                        throw new Error("generator should not have exited")
                    } else {
                        signal = nextResult.value;
                    }
                } else {
                    signal = {type: 'fail'}
                }

                switch (signal.type) {
                    case 'call': {
                        switch (signal.op || 'call') {
                            case 'call': { // The resolver needs a solution from a subgoal.
                                const {resume, resolver, goal: args, tracer} = signal;
                                goal.subgoalCall(resume, resolver, args, tracer)
                                break;
                            }
                            case 'redo': { // signal should have {key, resume}
                                const {resume, key} = signal
                                goal.subgoalRedo(resume, key)
                                break;
                            }
                            case 'done': {
                                const {resume, key} = signal
                                goal.subgoalDone(resume, key)
                                break;
                            }
                        }
                        break;
                    }

                    case 'fork': { // The resolver found multiple alternative paths.
                        const {resume, forks} = signal;
                        goal.scheduleAll(forks);
                        if (resume) {
                            goal.schedule({ resume });
                        }
                        break;
                    }

                    case 'exit': { // The resolver has found a solution
                        const {solution, resume, feedback: feedbackToken} = signal
                        goal.solutionsFound++;
                        goal.tracer?.(goal, 'EXIT', solution);

                        if (goal.notify) {
                            // If this was a sub-goal, resume its parent with the solution.
                            goal = goal.notifySolution(resume, solution)
                            continue
                        }
                        
                        if (goal.parent) {
                            throw new Error("internal error: subgoal produced a solution but notify is not set")
                        } else {
                            // This is a top-level solution. Yield it to the user.
                            // TODO use the outcome as feedback.
                            const outcome = yield solution;

                            // If more solutions might exist for this path, schedule the next one.
                            if (resume) {
                                goal.schedule({ resume });
                            }

                            if (!goal.checkCompleted()) {
                                goal.tracer?.(goal, 'REDO')
                            }
                        }
                        break;
                    }

                    case 'fail': {
                        if (goal.checkCompleted()) {
                            goal.tracer?.(goal, 'FAIL');
                            if (goal.notify) {
                                goal = goal.notifySolution(undefined, undefined)
                                continue; // Let loop continue with parent context
                            }

                            return;
                        }
                        break;
                    }
                }
            }
        }
    }
}
