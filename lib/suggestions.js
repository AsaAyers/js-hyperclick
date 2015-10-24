"use babel"
/*global atom */

import url from 'url'
import shell from 'shell'
import path from 'path'
import { sync as resolve } from 'resolve'

const scopeSize = ({parentBlock: b}) => b.end - b.start

export const isJavascript = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return (scopeName === 'source.js' || scopeName === 'source.js.jsx')
}

function findClosestScope(scopes, start, end) {
    return scopes.reduce((closest, scope) => {
        const { parentBlock } = scope

        if (parentBlock.start <= start
            && parentBlock.end >= end
            && scopeSize(scope) < scopeSize(closest)
        ) {
            return scope
        }

        return closest
    })
}

const find = (ar, cb) => ar.filter(cb)[0]

function resolveModule(textEditor, module) {
    const coffeeExtensions = ['.coffee', '.litcoffee', '.coffee.md']
    const basedir = path.dirname(textEditor.getPath())
    const options = {
        basedir,
        extensions: [ '.js', ...coffeeExtensions]
    }

    const filename = resolve(module.module, options)
    if (filename == module.module) {
        return `http://nodejs.org/api/${module.module}.html`
    }
    return filename
}


export default function(textEditor, text, range, cache) {
    const { scopes, externalModules } = cache.get(textEditor)
    const start = textEditor.buffer.characterIndexForPosition(range.start)
    const end = textEditor.buffer.characterIndexForPosition(range.end)

    const closestScope = findClosestScope(scopes, start, end)

    // Sometimes it reports it has a binding, but it can't actually get the
    // binding
    if (closestScope.hasBinding(text) && closestScope.getBinding(text)) {

        const binding = closestScope.getBinding(text)
        const { line, column } =  binding.identifier.loc.start

        const module = find(externalModules, (m) => {
            const { start: bindingStart } = binding.identifier
            return m.local == text && m.start == bindingStart
        })

        if (module) {
            return {
                range,
                callback() {
                    // ctrl+click creates multiple cursors. This will remove all but the
                    // last one to simulate cursor movement instead of creation.
                    const lastCursor = textEditor.getLastCursor()
                    textEditor.setCursorBufferPosition(lastCursor.getBufferPosition())

                    const filename = resolveModule(textEditor, module)

                    const { protocol } = url.parse(filename)
                    if (protocol === 'http:' || protocol === 'https:') {
                        if (atom.packages.isPackageLoaded('web-browser')) {
                            atom.workspace.open(filename)
                        } else {
                            shell.openExternal(filename)
                        }
                        return
                    }

                    atom.workspace.open(filename).then((editor) => {
                        const { exports } = cache.get(editor)
                        let target = exports[module.imported]
                        if (target == null) {
                            target = exports.default
                        }

                        if (target != null) {
                            const position = editor.getBuffer().positionForCharacterIndex(target.start)
                            editor.setCursorBufferPosition(position)
                        }

                    })

                }
            }

        }


        // Exit early if you clicked on where the variable is declared
        if (line - 1 == range.start.row && column == range.start.column) {
            return null
        }

        return {
            range,
            callback() {
                textEditor.setCursorBufferPosition([line - 1, column])
                textEditor.scrollToCursorPosition()
            }
        }
    }
}
