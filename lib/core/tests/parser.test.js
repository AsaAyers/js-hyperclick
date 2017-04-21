/*eslint-env jest */
import extractAnnotations from './utils/extract-annotations'
import { parseCode } from '../index'


describe('parseCode', () => {
    test('parse-error.js reports a parse error', () => {
        const { code } = extractAnnotations('parse-error.js')
        const info = parseCode(code)

        expect(info.parseError).not.toBeUndefined()
    })

    test('es6-module.js does not have a parse error', () => {
        const { code } = extractAnnotations('es6-module.js')
        const info = parseCode(code)

        expect(info.parseError).toBeUndefined()

    })

    test('cjs.js does not have a parse error', () => {
        const { code } = extractAnnotations('cjs.js')
        const info = parseCode(code)

        expect(info.parseError).toBeUndefined()

    })
})
