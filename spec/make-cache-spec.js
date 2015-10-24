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
        }())
        `).scopes

        expect(actual.length).toBe(4)
    })

    it("Gathers requires", function() {
        const actual = parseCode(`
        const foo = require('./foo')
        const badRequire = require(foo.name)
        const { bar } = require('./bar')

        import someDefault, { named as renamed } from './other'

        function whatever() {
            const x = require('something')
        }

        `).externalModules

        expect(actual[0].name).toBe('foo')
        expect(actual[0].module).toBe('./foo')

        expect(actual[1].name).toBe('bar')
        expect(actual[1].module).toBe('./bar')

        expect(actual[2].name).toBe('someDefault')
        expect(actual[2].module).toBe('./other')

        expect(actual[3].name).toBe('renamed')
        expect(actual[3].module).toBe('./other')

        expect(actual[4].name).toBe('x')
        expect(actual[4].module).toBe('something')
    })


})
