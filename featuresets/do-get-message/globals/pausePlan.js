import workspace from "@workspace/globals/workspace"

/**
 * Pauses the current running plan.
 */
export default () => workspace.write({'plan/paused': {source: 'true', type: 'json'}})
