"use babel"
/* eslint-env jasmine */
import path from 'path'
import { resolveModule } from '../lib/core'

describe('resolveModule', () => {

    const options = {}
    it('relative path with extension', () => {
        const suggestion = {
            moduleName: './parser.test.js'
        }
        const expected = { filename: path.join(__dirname, 'parser.test.js') }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('built in node module', () => {
        const suggestion = {
            moduleName: 'path'
        }
        const expected = { url: "http://nodejs.org/api/path.html" }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('from node_modules', () => {
        const suggestion = {
            moduleName: 'resolve'
        }

        const expected = {
            filename: path.join(__dirname, '../node_modules/resolve/index.js')
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('missing modules return undefined', () => {
        const suggestion = {
            moduleName: 'some-unexpected-module'
        }
        const expected = { filename: undefined }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('relative path a new file includes the .js extension', () => {
        const suggestion = {
            moduleName: './newFile'
        }
        const expected = {
            filename: path.join(__dirname, './newFile.js')
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('full path with unsupported extension resolves the file', () => {
        const suggestion = {
            moduleName: './fixtures/custom-extension.jsx'
        }
        const expected = {
            filename: path.join(__dirname, './fixtures/custom-extension.jsx')
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('custom file extensions', () => {
        const suggestion = {
            moduleName: './fixtures/custom-extension-2'
        }
        const expected = {
            filename: path.join(__dirname, './fixtures/custom-extension-2.jsx')
        }
        const options = {
            extensions: [ '.js', '.json', '.node', '.jsx' ]
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it('missing custom extension resolves to a new .js file', () => {
        const suggestion = {
            moduleName: './fixtures/custom-extension'
        }
        const expected = {
            filename: path.join(__dirname, './fixtures/custom-extension.js')
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it(`resolve using moduleRoots in project.json`, () => {
        const suggestion = {
            moduleName: 'parse-code'
        }
        const expected = {
            filename: path.join(__dirname, '../lib/core/parse-code.js')
        }

        const actual = resolveModule(__filename, suggestion, options)
        expect(actual).toEqual(expected)
    })

    it(`resolving when there is no package.json`, () => {
        const suggestion = {
            moduleName: 'parse-code'
        }
        const expected = { filename: undefined }
        const actual = resolveModule('/foo.js', suggestion, options)

        expect(actual).toEqual(expected)
    })


})
