"use babel"
// @flow
/*eslint-env jasmine */
import extractAnnotations from './utils/extract-annotations'
import { parseCode } from '../lib/core'

describe('parseCode', () => {
    it('parse-error.js reports a parse error', () => {
        const { code } = extractAnnotations('parse-error.js')
        const info = parseCode(code)

        // $FlowFixMe
        expect(info.parseError).not.toBeUndefined()
    })

    it('es6-module.js does not have a parse error', () => {
        const { code } = extractAnnotations('es6-module.js')
        const info = parseCode(code)

        // $FlowFixMe
        expect(info.parseError).toBeUndefined()
    })

    it('cjs.js does not have a parse error', () => {
        const { code } = extractAnnotations('cjs.js')
        const info = parseCode(code)

        // $FlowFixMe
        expect(info.parseError).toBeUndefined()
    })
})
