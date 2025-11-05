import logic from "@/lib/logic/logic.js";

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {source} = unit
    const { generatedSource } = logic.compile({source, outputFormat: 'module'});
    return generatedSource
}
