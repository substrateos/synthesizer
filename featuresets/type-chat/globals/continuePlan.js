import workspace from "@/globals/workspace"

/**
 * Continues execution of the current plan.
 */
export default () => workspace.eval({source: '', type: 'chat/plan'})
