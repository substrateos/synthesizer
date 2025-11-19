export default {
    base: import.meta.url,
    urls: [
        'do/get/default.js',
        'do/get/default/javascript:ast.js',
        'do/get/default/javascript:deps.js',
        'do/get/default/javascript:depmap.js',
        'do/get/default/javascript:docs.js',
        'do/get/javascript.js',

        'lib/javascript/acorn@8.15.0.js',
        'lib/javascript/acorn-walk@8.3.4.js',
        'lib/javascript/prepareDynamicImports.js',
        'lib/javascript/findDocs.js',
        'lib/javascript/findExports.js',
        'lib/javascript/findImports.js',
        'lib/javascript/findFreeVariables.js',
        'lib/javascript/insertReturn.js',
        'lib/javascript/parse.js',
    ],
    main: 'do/get/javascript.js',
}