import parse from "@/lib/javascript/parse"
import findImports from "@/lib/javascript/findImports"
import findExports from "@/lib/javascript/findExports"

export default function(code) {
    const {ast} = parse({source: code})
    return {
        imports: findImports({ast}),
        exports: findExports({ast}),
    }
}
