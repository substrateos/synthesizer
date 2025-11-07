import createFrame from "@/lib/vscode/createFrame"

export default async function () {
    const {action, unit, name, workspace} = this
    document.body.appendChild(await createFrame(workspace));
}
