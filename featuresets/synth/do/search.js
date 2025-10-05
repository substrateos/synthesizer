import search from "@workspace/lib/search/search"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute="source", pattern} = handlerInputs ?? {}

    const units = workspace.query()
    return search({units, pattern, attribute})
}
