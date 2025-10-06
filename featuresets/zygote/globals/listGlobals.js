import {getWorkspace} from "@workspace"

/**
 * Return a list of globals available in the current environment.
 */
export default () => getWorkspace().names().filter(name => /^globals\/[^/]+$/.test(name)).map(name => name.replace(/^globals\//, ''))
