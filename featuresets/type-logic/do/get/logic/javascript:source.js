import compileProgram from "@/lib/logic/compile/program.js";

export default async function (handlerInputs) {
    const {action, unit, name, workspace} = this
    const {source} = unit
    const { generatedSource } = compileProgram({source, outputFormat: 'module'});
    return generatedSource
}
