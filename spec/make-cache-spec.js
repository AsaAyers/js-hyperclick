"use babel"
/*eslint-env jasmine */

import { parseCode } from '../lib/make-cache.js'

describe("makeCache.parseCode", function() {

    it("gathers the scopes for a file", function() {
        const actual = parseCode(`
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
        `).scopes

        expect(actual.length).toBe(5)
    })

    it("Gathers requires", function() {
        const actual = parseCode(`
        const foo = require('./foo')
        const badRequire = require(foo.name)
        const { bar } = require('./bar')

        import someDefault, { named as renamed, notRenamed } from './other'

        function whatever() {
            const x = require('something')
        }

        `).externalModules

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
        const actual = parseCode(`
        export default function Something() {}
        export { bar }
        export { whatever as baz}
        export const foo = 'foo'

        export function exportedFunction() {}
        `).exports

        expect(actual.default).not.toBeUndefined()
        expect(actual.bar).not.toBeUndefined()
        expect(actual.whatever).toBeUndefined()
        expect(actual.baz).not.toBeUndefined()
        expect(actual.foo).not.toBeUndefined()
        expect(actual.exportedFunction).not.toBeUndefined()
    })

    it("Gathers module.exports", function() {
        const actual = parseCode(`
        module.exports = {}
        `).exports

        expect(actual.default).not.toBeUndefined()
    })

    it("Gathers paths from imports / requires", function() {
        const actual = parseCode(`
        const foo = require('./foo')
        const badRequire = require(foo.name)
        const { bar } = require('./bar')

        import someDefault, { named as renamed, notRenamed } from './other'

        function whatever() {
            const x = require('something')
        }
        `).paths

        expect(actual[0].module).toBe('./foo')
        expect(actual[1].module).toBe('./bar')
        expect(actual[2].module).toBe('./other')
        expect(actual[3].module).toBe('something')
    })


})
