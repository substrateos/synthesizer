import bootstrapFetchUnits from "../fetchUnits/lib/fetchUnits/fetchUnits.js"

const fetchUnitsFromManifestAt = async (manifestURL, ...options) => {
    const {urls, base, main} = (await import(manifestURL)).default
    const units = await bootstrapFetchUnits(base, urls, ...options)
    return {
        units,
        main,
    }
}

const synthUnitsFromManifestsAt = async (makeSynth, manifestURLs) => {
    // for each manifest, fetch all the units
    // if a manifest specifies a main, make a synth for it and use that synth as a unit. for now make a unit with an evaluation already set to that synth.

    const synthUnits = {}
    for (const manifestURL of manifestURLs) {
        let {units, main} = await fetchUnitsFromManifestAt(manifestURL)
        if (main) {
            const synth = makeSynth()
            synth.debug = true
            await synth.write(units)

            // trim the suffix from main
            main = main.replace(/\.[^.]+$/, '')
            const mainUnit = await synth.get(main)
            // todo should really return a proxy so we can keep editing the synth
            // todo should include docs
            
            synthUnits[main] = {evaluation: mainUnit, synth}
        } else {
            Object.assign(synthUnits, units)
        }
    }

    return synthUnits
}

const bootstrapUnits0 = async () => ({
    // these are part of the bootstrapping sequence, so must be provided as values directly for now.
    'bootstrap/do/get/default': {evaluation: (await import('@@/type-javascript/do/get/default.js')).default},
    'bootstrap/do/get/javascript': {evaluation: (await import('@@/type-javascript/do/get/javascript.js')).default},

    ...(await fetchUnitsFromManifestAt('@@/do-get/manifest.js', {
        do: {get: 'bootstrap/do/get/javascript'},
    })).units,

    ...(await fetchUnitsFromManifestAt('@@/type-javascript/manifest.js', {
        do: {get: 'bootstrap/do/get/javascript'},
    })).units,

    ...(await fetchUnitsFromManifestAt('@@/type-javascript-tests/manifest.js')).units,

    ...(await fetchUnitsFromManifestAt('@@/type-example-json/manifest.js', {
        do: {get: 'bootstrap/do/get/javascript'},
    })).units,

    ...(await fetchUnitsFromManifestAt('@@/fetchUnits/manifest.js', {
        do: {get: 'bootstrap/do/get/javascript'},
    })).units,

    ...(await fetchUnitsFromManifestAt('@@/Synth/manifest.js', {
        do: {get: 'bootstrap/do/get/javascript'},
    })).units,
})

const bootstrapSynth = await (async () => {
    const {default: BootstrapSynth} = await import('@@/Synth/lib/synth/Synth.js')
    const synth = new BootstrapSynth()
    await synth.write(await bootstrapUnits0())
    return synth
})();

export const Synth = (await bootstrapSynth.get('lib/synth/Synth.js')).default
export const doGet = (await bootstrapSynth.get('do/get')).default
export const fetchUnits = (await bootstrapSynth.get('lib/fetchUnits/fetchUnits.js')).default
export const doGetJavascript = (await bootstrapSynth.get('do/get/javascript')).default
export const doGetDefault = (await bootstrapSynth.get('do/get/default')).default

export const synthUnits = async () => {
    const minUnits = {
        // we can upgrade this by loading the new version of this anonymously and then replacing this unit with that evaluation
        // but this is part of the bootstrapping sequence, so must be provided as a value directly for now.
        'do/get': {evaluation: doGet},
        'do/get/javascript': {evaluation: doGetJavascript, synth: bootstrapSynth},
        'do/get/default': {evaluation: doGetDefault, synth: bootstrapSynth},

        ...(await fetchUnitsFromManifestAt('@@/type-example-json/manifest.js')).units,
    }

    return {
        ...minUnits,
        ...await synthUnitsFromManifestsAt(() => {
            const synth = new Synth()
            synth.write(minUnits)
            return synth
        }, [
            '@@/type-json/manifest.js',
            '@@/do-test/manifest.js',
            '@@/do-dump/manifest.js',
            '@@/do-search/manifest.js',
            '@@/do-sample/manifest.js',
            '@@/zygote/manifest.js',
        ]),
    }
}
