import {solve, solveAsync} from '@/lib/logic/solve'
import vars from '@/lib/logic/vars'
import tracer from '@/lib/logic/tracer'
import all from '@/lib/logic/all'
import BFS from '@/lib/logic/schedulers/BFS'
import DFS from '@/lib/logic/schedulers/DFS'

export default {
    all,
    solve,
    solveAsync,
    vars,
    tracer,
    schedulers: {
        BFS,
        DFS,
    },
}