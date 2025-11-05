import {solve, solveAsync} from "@/lib/logic/solve.js"
import vars from "@/lib/logic/vars.js"
import repr from "@/lib/logic/repr.js"
import tracer from "@/lib/logic/tracer.js"
import findall from "@/lib/logic/findall.js"
import BFS from "@/lib/logic/schedulers/BFS.js"
import DFS from "@/lib/logic/schedulers/DFS.js"
import compile from "@/lib/logic/compile/program.js"
import runtime from "@/lib/logic/runtime.js"

export default {
    compile,
    runtime,
    findall,
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