import BootstrapSynth from '@workspace/lib/synth/Synth.js'
import bootstrapDoGetJavascript from './do/get/javascript.js'
import fetchUnits from '@workspace/lib/synth/fetchUnits.js'

const bootstrapUnits0 = async () => ({
    // these are part of the bootstrapping sequence, so must be provided as values directly for now.
    'bootstrap/do/get/javascript': {evaluation: bootstrapDoGetJavascript},

    // these must indicate they want to use bootstrap/do/get/javascript
    ...await fetchUnits(import.meta.url, [
        'lib/synth/doer.js',
        'lib/synth/Tracer.js',
        'do/get.js',
        'do/get/javascript.js',
        'do/get/javascript/ast.js',
        'do/get/javascript/deps.js',
        'do/get/javascript/docs.js',
        'lib/javascript/prepareDynamicImports.js',
        'lib/javascript/insertReturn.js',
        'lib/javascript/findDocs.js',
        'lib/javascript/findImports.js',
        'lib/javascript/findFreeVariables.js',
        'lib/javascript/acorn@8.15.0.js',
        'lib/javascript/acorn-walk@8.3.4.js',
        'lib/javascript/parse.js',
    ], {
        do: {get: 'bootstrap/do/get/javascript'},
    }),

    // these we can load as normal
    ...await fetchUnits(import.meta.url, [
            'lib/synth/Synth.js',
            'lib/synth/UnitStore.js',
            'lib/synth/unitOf.js',
            'lib/ulid.js',
        ]),
})

const bootstrapSynth = new BootstrapSynth()
await bootstrapSynth.write(await bootstrapUnits0())

export const doGetJavascript = {
    ...await bootstrapSynth.get('do/get/javascript', null),
    evaluation: (await bootstrapSynth.get('do/get/javascript')).default,
    do: undefined,
}

export const Synth = (await bootstrapSynth.get('lib/synth/Synth')).default

export { default as unitOf } from '@workspace/lib/synth/unitOf.js'

export { fetchUnits }

export const synthUnits = async () => ({
    // we can upgrade this by loading the new version of this anonymously and then replacing this unit with that evaluation
    // but this is part of the bootstrapping sequence, so must be provided as a value directly for now.
    'do/get/javascript': doGetJavascript,

    ...await fetchUnits(import.meta.url, [
            'do/get/javascript/ast.js',
            'do/get/javascript/deps.js',
            'do/get/javascript/docs.js',
            'do/get/example/json/evaluation.js',
            'do/get/json/evaluation.js',
            'do/get/javascript/docs.js',

            'do/test.js',
            'do/sample.js',
            'do/search.js',

            'lib/synth/doer.js',
            'do/get.js',

            'globals/help.js',

            'lib/jsondiffpatch/diff.js',
            'lib/jsondiffpatch/diff/examples/simple.js',
            'lib/jsondiffpatch/jsondiffpatch.js',
            'lib/jsondiffpatch/jsondiffpatch.js.map',

            'lib/search/search.js',
            'lib/search/search/examples/simple.js',

            'lib/synth/unitOf.js',
            'lib/synth/UnitStore.js',
            'lib/synth/Synth.js',
            'lib/synth/Tracer.js',
            'lib/ulid.js',

            'lib/synth/fetchUnits.js',

            'lib/javascript/acorn@8.15.0.js',
            'lib/javascript/acorn-walk@8.3.4.js',
            'lib/javascript/astNodeToValue.js',
            'lib/javascript/prepareDynamicImports.js',
            'lib/javascript/findDocs.js',
            'lib/javascript/findExports.js',
            'lib/javascript/findImports.js',
            'lib/javascript/findStaticExports.js',
            'lib/javascript/findFreeVariables.js',
            'lib/javascript/insertReturn.js',
            'lib/javascript/parse.js',
            'lib/javascript/integration/modules.js',
            'lib/javascript/integration/modules/tests/imports.js',
            'lib/javascript/integration/modules/tests/advanced.js',
            'lib/javascript/integration/modules/tests/exports.js',
            'lib/javascript/integration/scripts.js',
            'lib/javascript/integration/scripts/tests/freeVariables.js',
        ]),
})
