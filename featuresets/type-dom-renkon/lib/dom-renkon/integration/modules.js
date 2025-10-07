import parse from "@/lib/dom-renkon/parse"
import findDefaultExports from "@/lib/dom-renkon/findDefaultExports"

export default function(code) {
    const {ast} = parse({source: code})
    return {
        defaultExports: findDefaultExports({ast}),
    }
}
