import {jsondiffpatch} from "@/lib/jsondiffpatch@0.7.3/jsondiffpatch.js"

export default function delta({a, b}) {
    return jsondiffpatch.diff(a, b);
}
