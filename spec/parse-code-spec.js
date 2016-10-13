"use babel"
/*eslint-env jasmine */

import parseCode from '../lib/parse-code.js'
import fs from 'fs'
import path from 'path'

describe("makeCache.parseCode", function() {

    it("can parse every file in js-hyperclick", function() {
        const filenames = [
            './parse-code-spec.js',
            '../lib/js-hyperclick.js',
            '../lib/make-cache.js',
            '../lib/parse-code.js',
            '../lib/suggestions.js',
            '../.eslintrc.js'
        ]

        filenames.forEach(name => {
            const fullFilename = path.join(__dirname, name)
            const code = String(fs.readFileSync(fullFilename))

            const { parseError } = parseCode(code)
            expect(parseError && parseError.message).toBeUndefined(fullFilename)
        })
    })

    it("gathers the scopes for a file", function() {
        const { parseError, scopes: actual } = parseCode(`
        // 1
        (function() {
            // 2

            var noop = () => null // 3

            if (noop) {
                // 4
            }

            function foo() {
                // 5
            }
        }())
        `)
        if (parseError) throw parseError

        expect(actual.length).toBe(5)
    })

    it("Gathers requires", function() {
        const { parseError, externalModules: actual } = parseCode(`
        const foo = require('./foo')
        const badRequire = require(foo.name)
        const { bar } = require('./bar')

        import someDefault, { named as renamed, notRenamed } from './other'

        function whatever() {
            const x = require('something')
        }

        `)
        if (parseError) throw parseError

        let id = 0
        expect(actual[id].local).toBe('foo')
        expect(actual[id].module).toBe('./foo')
        expect(actual[id].imported).toBe('default')

        id++
        expect(actual[id].local).toBe('bar')
        expect(actual[id].module).toBe('./bar')
        expect(actual[id].imported).toBe('default')

        id++
        expect(actual[id].local).toBe('someDefault')
        expect(actual[id].module).toBe('./other')
        expect(actual[id].imported).toBe('default')

        id++
        expect(actual[id].local).toBe('renamed')
        expect(actual[id].module).toBe('./other')
        expect(actual[id].imported).toBe('named')

        id++
        expect(actual[id].local).toBe('notRenamed')
        expect(actual[id].module).toBe('./other')
        expect(actual[id].imported).toBe('notRenamed')

        id++
        expect(actual[id].local).toBe('x')
        expect(actual[id].module).toBe('something')
        expect(actual[id].imported).toBe('default')
    })

    it("Gathers exports", function() {
        const { parseError, exports: actual } = parseCode(`
        export default function Something() {}
        export { bar }
        export { whatever as baz}
        export const foo = 'foo'

        export function exportedFunction() {}
        `)
        if (parseError) throw parseError

        expect(actual.default).not.toBeUndefined()
        expect(actual.bar).not.toBeUndefined()
        expect(actual.whatever).toBeUndefined()
        expect(actual.baz).not.toBeUndefined()
        expect(actual.foo).not.toBeUndefined()
        expect(actual.exportedFunction).not.toBeUndefined()
    })

    it("Gathers module.exports", function() {
        const {parseError, exports: actual} = parseCode(`
        module.exports = {}
        `)
        if (parseError) throw parseError

        expect(actual.default).not.toBeUndefined()
    })

    it("Gathers paths from imports / requires", function() {
        const { parseError, paths: actual } = parseCode(`
        const foo = require('./foo')
        const badRequire = require(foo.name)
        const { bar } = require('./bar')

        import someDefault, { named as renamed, notRenamed } from './other'

        function whatever() {
            const x = require('something')
        }

        export * from './export-all'
        export { y } from './named-exports'
        export default from './base/Component.react'

        `)
        if (parseError) throw parseError

        expect(actual[0].module).toBe('./foo')
        expect(actual[1].module).toBe('./bar')
        expect(actual[2].module).toBe('./other')
        expect(actual[3].module).toBe('something')
        expect(actual[4].module).toBe('./export-all')
        expect(actual[5].module).toBe('./named-exports')
        expect(actual[6].module).toBe('./base/Component.react')
    })


})
