import {solve, solveAsync} from "@/lib/logic/solve.js"
import vars from "@/lib/logic/vars.js"
import repr from "@/lib/logic/repr.js"
import tracer from "@/lib/logic/tracer.js"
import all from "@/lib/logic/all.js"
import BFS from "@/lib/logic/schedulers/BFS.js"
import DFS from "@/lib/logic/schedulers/DFS.js"

export default {
    all,
    solve,
    solveAsync,
    vars,
    repr,
    tracer,
    schedulers: {
        BFS,
        DFS,
    },
}