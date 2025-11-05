import compare from "@/lib/logic/compile/generate/ops/compare.js";
import debuggerOp from "@/lib/logic/compile/generate/ops/debugger.js";
import js from "@/lib/logic/compile/generate/ops/js.js";
import findall from "@/lib/logic/compile/generate/ops/findall.js";
import is_ground from "@/lib/logic/compile/generate/ops/is_ground.js";
import subgoal from "@/lib/logic/compile/generate/ops/subgoal.js";
import negation from "@/lib/logic/compile/generate/ops/negation.js";
import unify from "@/lib/logic/compile/generate/ops/unify.js";

/**
 * A dispatch table that maps IR goal types to their respective
 * code generator functions.
 */
export default {
    compare,
    debugger: debuggerOp,
    js,
    findall,
    is_ground,
    subgoal,
    negation,
    unify,
};
