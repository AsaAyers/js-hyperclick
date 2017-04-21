/* eslint-env jest */
import path from 'path'

import extractAnnotations from './utils/extract-annotations'
import findLocation from './utils/find-location'
import { parseCode, buildSuggestion, resolveModule, findDestination } from '../index'

const buildExpectations = (srcFilename) => () => {
    const { code, annotations } = extractAnnotations('all-imports.js')
    const info = parseCode(code)
    const runner = (name) => {
        if (annotations[name]) {
            const { text, start, end } = annotations[name]
            return buildSuggestion(info, text, { start, end })
        }
    }
    expect.extend({
        toLinkToExternalModuleLocation(startAnnotation, endAnnotation) {
            const suggestion = runner(startAnnotation)

            const { filename } = resolveModule(srcFilename, suggestion)
            const { code, annotations } = extractAnnotations(filename)
            const info = parseCode(code)

            const actual = findDestination(info, suggestion)

            const expected = annotations[endAnnotation]

            const pass = (
                suggestion != null
                && expected != null
                && actual.start === expected.start
                // && actual.moduleName === moduleName
                // && actual.imported === imported
            )

            const message = () => {
                let str = (pass
                    ? this.utils.matcherHint('.not.toLinkToExternalModuleLocation', startAnnotation, endAnnotation)
                    : this.utils.matcherHint('.toLinkToExternalModuleLocation', startAnnotation, endAnnotation)
                ) + "\n\n"

                if (!expected || expected.start == null) {
                    str += `Annotation ${this.utils.EXPECTED_COLOR(endAnnotation)} not found\n`
                } else {
                    str += `Expected ${pass ? 'not ' : ''}to jump to:\n`
                    str += `${this.utils.EXPECTED_COLOR(findLocation(code, expected.start))}\n`
                }

                if (actual == null) {
                    str += `Annotation ${this.utils.RECEIVED_COLOR(startAnnotation)} not found\n`
                } else if (!pass) {
                    str += `Actually jumped to:\n`
                    str += `${this.utils.RECEIVED_COLOR(findLocation(code, actual.start))}\n`
                }

                return str
            }

            return { pass, message }
        },
    })
}

describe(`findDestination (all-imports.js)`, () => {
    const srcFilename = path.join(__dirname, 'fixtures/all-imports.js')
    beforeEach(buildExpectations(srcFilename))

    test('default import links to the default export', () => {
        expect('someModule').toLinkToExternalModuleLocation('defaultExport')
    })

    test(`named import links to the named export`, () => {
        expect('namedExportFrom').toLinkToExternalModuleLocation('namedExportFrom')
        expect('name1').toLinkToExternalModuleLocation('name1')
        expect('name2').toLinkToExternalModuleLocation('name2')
        expect('name3').toLinkToExternalModuleLocation('name3')
        expect('name4').toLinkToExternalModuleLocation('name4')
    })

    test('missingExport will go to the default export', () => {
        expect('missingExport').toLinkToExternalModuleLocation('defaultExport')
    })

    test(`throws when you give it a bad suggestion object`, () => {
        const suggestion = {}
        const info = {}

        expect(() => {
            findDestination(info, suggestion)
        }).toThrow(/Invalid suggestion type/)

    })
})
