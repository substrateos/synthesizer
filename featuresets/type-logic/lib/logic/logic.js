import solve from '@/lib/logic/solve'
import vars from '@/lib/logic/vars'
import BFS from '@/lib/logic/schedulers/BFS'
import DFS from '@/lib/logic/schedulers/DFS'

export default {
    solve,
    vars,
    schedulers: {
        BFS,
        DFS,
    },
}