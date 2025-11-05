import parse from "@/lib/javascript/parse.js"
import findImports from "@/lib/javascript/findImports.js"
import findExports from "@/lib/javascript/findExports.js"

export default function(code) {
    const {ast} = parse({source: code})
    return {
        imports: findImports({ast}),
        exports: findExports({ast}),
    }
}
