import {jsondiffpatch} from '@workspace/lib/jsondiffpatch/jsondiffpatch'

export default function delta({a, b}) {
    return jsondiffpatch.diff(a, b);
}
