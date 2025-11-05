import parse from "@/lib/dom-renkon/parse.js"
import findDefaultExports from "@/lib/dom-renkon/findDefaultExports.js"

export default function(code) {
    const {ast} = parse({source: code})
    return {
        defaultExports: findDefaultExports({ast}),
    }
}
