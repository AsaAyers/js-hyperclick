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
        `)

        expect(actual.scopes.length).toBe(4)
    })


})
