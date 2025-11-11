import DFS from "@/lib/logic/schedulers/DFS.js";
import {configTag} from "@/lib/logic/tags.js"

export default function GoalSeries({nextID=1, defaultSchedulerClass=DFS, defaultTracer}={}) {
    // A "Goal" is a context object for a single query instance (e.g., `path(X, 'd')`).
    // It tracks the overall state for that query, including solutions found, and
    // pending work (choice points/forks).
    return class Goal {
        constructor({parent, key, resolver, args, scheduler, tracer, location}) {
            this.id = nextID++
            this.resolver = resolver
            this.args = args
            this.generator = resolver.apply(null, args)
            this.tracer = tracer || defaultTracer
            this.location = location

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
            this.schedule({trace: ["CALL", location]})
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

        subgoalCall(resume, resolver, args, tracer, location) {
            const key = Symbol()
            const schedulerClass = resolver[configTag]?.schedulerClass
            const scheduler = schedulerClass ? new schedulerClass() : this.scheduler
            const subgoal = new Goal({ parent: this, key, resolver, scheduler, args, tracer: tracer || this.tracer, location });
            this.subgoals.set(key, subgoal);
            this.#subgoalSchedule(resume, subgoal)
        }

        subgoalRedo(resume, key, location) {
            const subgoal = this.subgoals.get(key);
            subgoal.tracer?.(subgoal, 'REDO', location)
            // update our resume token, then switch to subgoal
            if (!subgoal || subgoal.isComplete) {
                subgoal.tracer?.(subgoal, 'FAIL', location)
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

        /**
         * Private: Gets the next task and runs the generator to get a signal.
         * This is always synchronous.
         * @returns {object} The signal from the resolver, or a 'fail' signal.
         */
        #step() {
            const next = this.scheduler.next();

            let goal;
            let signal;
            if (next) {
                goal = next.goal;
                goal.scheduledTasks--;

                if (next.subgoal) {
                    // switch to the goal it's for
                    const subgoal = next.subgoal
                    subgoal.continueAsSubgoal(next.notify)
                    return {goal: subgoal, signal: {type: undefined}} // fake signal
                }

                const task = next.task
                if (task.trace) {
                    goal.tracer?.(goal, ...task.trace)
                }

                // Run the generator
                const nextResult = goal.generator.next(task);
                if (nextResult.done) {
                    throw new Error("generator should not have exited")
                }
            
                signal = nextResult.value;
            } else {
                goal = this;
                signal = {type: 'fail'}
            }

            return goal.#handleSignal(signal)
        }

        /**
         * Private: Handles all common signals.
         * This is always synchronous.
         * @param {object} signal - The signal from #getSignal()
         * @returns {object} An object { goal, solutionToYield }.
         * `goal` is the next goal context (or undefined on final fail).
         * `solutionToYield` is a solution to be yielded, if any.
         */
        #handleSignal(signal) {
            let currentGoal = this;
            let solutionToYield = undefined;

            switch (signal.type) {
                case 'call': {
                    switch (signal.op || 'call') {
                        case 'call': { 
                            const {resume, resolver, goal: args, tracer, location} = signal;
                            currentGoal.subgoalCall(resume, resolver, args, tracer, location)
                            break;
                        }
                        case 'redo': {
                            const {resume, key, location} = signal
                            currentGoal.subgoalRedo(resume, key, location)
                            break;
                        }
                        case 'done': {
                            const {resume, key} = signal
                            currentGoal.subgoalDone(resume, key)
                            break;
                        }
                    }
                    break;
                }

                case 'fork': { 
                    const {resume, forks} = signal;
                    currentGoal.scheduleAll(forks);
                    if (resume) {
                        currentGoal.schedule({ resume });
                    }
                    break;
                }

                case 'exit': { 
                    const {solution, resume, feedback: feedbackToken} = signal
                    currentGoal.solutionsFound++;
                    currentGoal.tracer?.(currentGoal, 'EXIT', solution);

                    if (currentGoal.notify) {
                        currentGoal = currentGoal.notifySolution(resume, solution)
                    } else if (currentGoal.parent) {
                        throw new Error("internal error: subgoal produced a solution but notify is not set")
                    } else {
                        // This is a top-level solution.
                        // Tell the main loop to yield it.
                        solutionToYield = solution;
                        
                        if (resume) {
                            currentGoal.schedule({ resume });
                        }
                        if (!currentGoal.checkCompleted()) {
                            currentGoal.tracer?.(currentGoal, 'REDO')
                        }
                    }
                    break;
                }

                case 'fail': {
                    if (currentGoal.checkCompleted()) {
                        currentGoal.tracer?.(currentGoal, 'FAIL', signal.location);
                        if (currentGoal.notify) {
                            currentGoal = currentGoal.notifySolution(undefined, undefined)
                        } else {
                            // Final fail, signal loop to terminate
                            currentGoal = undefined;
                        }
                    }
                    break;
                }
            }

            return { goal: currentGoal, solutionToYield, signal };
        }


        /**
         * Synchronous solver loop.
         */
        *solve() {
            let goal = this;

            while (goal) {
                const { goal: nextGoal, solutionToYield, signal } = goal.#step();

                if (signal.type === 'await') {
                    throw new Error(
                        "Async operation (await) detected in a 'logic.solve' block. " +
                        "Use 'logic.solveAsync' to enable asynchronous operations."
                    );
                }
                
                if (solutionToYield) {
                    yield solutionToYield;
                }
                
                goal = nextGoal;
            }
        }

        /**
         * Asynchronous solver loop.
         */
        async *solveAsync() {
            let goal = this;

            while (goal) {
                const { goal: nextGoal, solutionToYield, signal } = goal.#step();

                if (signal.type === 'await') {
                    const { promise, resume } = signal;
                    
                    let resumeValue;
                    try {
                        const resolvedValue = await promise;
                        resumeValue = { status: 'resolved', value: resolvedValue };
                    } catch (error) {
                        resumeValue = { status: 'rejected', error: error };
                    }
                    
                    // Reschedule the task, passing back the compound status object.
                    nextGoal.schedule({ resume, resumeValue });
                }

                if (solutionToYield) {
                    yield solutionToYield;
                }

                goal = nextGoal;
            }
        }
    }
}
