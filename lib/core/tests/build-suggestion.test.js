/*eslint-env jest */
import extractAnnotations from './utils/extract-annotations'
import findLocation from './utils/find-location'
import { parseCode, buildSuggestion, findDestination } from '../index'
import diff from 'jest-diff'

const buildExpectations = (filename) => () => {
    const { code, annotations } = extractAnnotations(filename)
    const info = parseCode(code)
    const runner = (name) => {
        if (annotations[name]) {
            const { text, start, end } = annotations[name]
            return buildSuggestion(info, text, { start, end })
        }
    }

    expect.extend({
        toLinkToModule(startAnnotation, moduleName, imported = 'default') {
            const actual = runner(startAnnotation)
            const pass = (
                actual != null
                && actual.moduleName === moduleName
                && actual.imported === imported
            )

            const message = () => {
                let str = this.utils.matcherHint(
                    (pass ? '.not' : '') + '.toLinkToModule',
                    startAnnotation,
                    this.utils.stringify(moduleName),
                    {
                        secondArgument: this.utils.stringify(imported),
                    }
                ) + "\n\n"

                if (annotations[startAnnotation] == null) {
                    str += `Annotation ${this.utils.EXPECTED_COLOR(startAnnotation)} not found\n`
                } else if (actual == null) {
                    str += `Annotation ${this.utils.EXPECTED_COLOR(startAnnotation)} is not a link.\n`
                } else if (!pass) {
                    const diffString = diff(
                        { moduleName, imported},
                        { moduleName: actual.moduleName, imported: actual.imported }
                    )
                    str += `Difference:\n\n${diffString}`
                }

                return str
            }

            return { pass, message }
        },
        toBeALink(startAnnotation) {
            const actual = runner(startAnnotation)

            const pass = (
                annotations[startAnnotation] != null
                && actual != null
            )

            const message = () => {
                let str = (pass
                    ? this.utils.matcherHint('.not.toBeALink', startAnnotation, '')
                    : this.utils.matcherHint('.toBeALink', startAnnotation, '')
                ) + "\n\n"

                if (annotations[startAnnotation] == null) {
                    str += `Annotation ${this.utils.EXPECTED_COLOR(startAnnotation)} not found\n`
                } else if (actual != null) {
                    str += `Actually jumped to:\n`
                    str += `${this.utils.RECEIVED_COLOR(findLocation(code, actual.start))}\n`
                }

                return str
            }


            return { pass, message }
        },
        toJumpTo(startAnnotation, endAnnotation) {
            const suggestion = runner(startAnnotation)
            const actual = findDestination(info, suggestion)
            const expected = annotations[endAnnotation] || {}

            const pass = (
                actual != null
                && actual.start === expected.start
            )

            const message = () => {
                let str = (pass
                    ? this.utils.matcherHint('.not.toJumpTo', startAnnotation, endAnnotation)
                    : this.utils.matcherHint('.toJumpTo', startAnnotation, endAnnotation)
                ) + "\n\n"

                if (expected.start == null) {
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

            return { pass, message}
        }
    })
}

describe('buildSuggestion', () => {

    describe('es6-module.js', () => {
        beforeEach(buildExpectations('es6-module.js'))

        test(`var/const/let/function declarations don't have a destination`, () => {
            expect('testVar').not.toBeALink()
            expect('testConst').not.toBeALink()
            expect('testLet').not.toBeALink()
            expect('functionDeclaration').not.toBeALink()
        })

        test(`variables (var/let/const) jump to their definitions`, () => {
            expect('log_testVar').toJumpTo('testVar')
            expect('log_testConst').toJumpTo('testConst')
            expect('log_testLet').toJumpTo('testLet')
        })

        test(`clicking a function parameter jumps to its definition`, () => {
            expect('log_param1').toJumpTo('param1')
        })

        test(`function declarations work inside and out`, () => {
            expect(`log_functionDeclaration`).toJumpTo('functionDeclaration')
            expect(`log2_functionDeclaration`).toJumpTo('functionDeclaration')
        })

        test(`destructuring works on params and variables`, () => {
            expect('log_dstrP1').toJumpTo('dstrP1')
            expect('log_dstrP2').toJumpTo('dstrP2')
            expect('log_dstrC1').toJumpTo('dstrC1')
            expect('log_dstrC2').toJumpTo('dstrC2')
        })

        test(`imported variables link to other modules`, () => {
            expect('otherDefault').toLinkToModule('./other')
            expect('log_otherDefault').toLinkToModule('./other')

            expect('otherNamed').toLinkToModule('./other', 'otherNamed')
            expect('log_otherNamed').toLinkToModule('./other', 'otherNamed')

            expect('renamed').toLinkToModule('./other', 'otherNamed2')
            expect('log_renamed').toLinkToModule('./other', 'otherNamed2')

        })

        test(`Renamed imports are links`, () => {
            expect('otherNamed2').toLinkToModule('./other', 'otherNamed2')
        })

        test(`exporting existing variables makes them links`, () => {
            expect(`export_testConst`).toJumpTo('testConst')
        })

        test(`export ... from statements are links`, () => {
            expect(`namedExportFrom`).toLinkToModule('./exportFrom', 'namedExportFrom')
            expect(`exportStar`).toLinkToModule('./exportStar.js')
            expect(`defaultExportFrom`).toLinkToModule('./exportFrom')
        })

        test(`keywords are not links`, () => {
            expect('if').not.toBeALink()
        })
    })

    describe('cjs.js', () => {
        beforeEach(buildExpectations('cjs.js'))

        test(`require() are supported`, () => {
            expect('basicRequire').toLinkToModule('./basicRequire', 'default')
        })

        test(`destructuring does not link to named exports`, () => {
            expect('destructured').toLinkToModule('./destructured', 'default')
            expect('renamed').toLinkToModule('./renamed', 'default')
        })

        test(`module.exports = require(...) is a link`, () => {
            expect('exports').toLinkToModule('./es6-module')
        })
    })
})
