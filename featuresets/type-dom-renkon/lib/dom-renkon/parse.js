import {parse as acornParse} from "@/lib/dom-renkon/acorn@8.15.0.js"

export default function parse({source}) {
    const ast = acornParse(source, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
    });

    return {
        ast,
    }
}
