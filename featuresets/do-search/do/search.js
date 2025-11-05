import search from "@/lib/search/search.js"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {attribute="source", pattern} = handlerInputs ?? {}

    const units = workspace.query()
    return search({units, pattern, attribute})
}
