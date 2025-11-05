import logic from "@/lib/logic/logic.js"

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this

    return logic.solveAsync([unit.source])
}
