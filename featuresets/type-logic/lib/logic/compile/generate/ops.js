import compare from '@/lib/logic/compile/generate/ops/compare';
import js from '@/lib/logic/compile/generate/ops/js';
import findall from '@/lib/logic/compile/generate/ops/findall';
import is_ground from '@/lib/logic/compile/generate/ops/is_ground';
import subgoal from '@/lib/logic/compile/generate/ops/subgoal';
import negation from '@/lib/logic/compile/generate/ops/negation';
import unify from '@/lib/logic/compile/generate/ops/unify';

/**
 * A dispatch table that maps IR goal types to their respective
 * code generator functions.
 */
export default {
    compare,
    js,
    findall,
    is_ground,
    subgoal,
    negation,
    unify,
};
