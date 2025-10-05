import workspace from "@workspace/globals/workspace"

/**
 * Return a list of globals available in the current environment.
 */
export default () => workspace.names().filter(name => /^globals\/[^/]+$/.test(name))
