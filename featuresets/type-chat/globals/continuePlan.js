import workspace from "@workspace/globals/workspace"

/**
 * Continues execution of the current plan.
 */
export default () => workspace.eval({source: '', type: 'chat/plan'})
