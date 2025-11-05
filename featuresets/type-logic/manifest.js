export default {
    base: import.meta.url,
    main: 'lib/logic/logic.js',
    urls: [
        'globals/logic.js',

        'lib/logic/testShim/files/importer.logic.js',
        'lib/logic/testShim/files/simple.logic.js',
        'lib/logic/testShim/files/math.js',
        'lib/logic/testShim/files/importer/tests/simple.js',

        'do/get/logic/evaluation.js',
        'do/get/logic/javascript:source.js',
    ],
}
