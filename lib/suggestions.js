"use babel"
/*global atom */

import url from 'url'
import shell from 'shell'
import path from 'path'
import { sync as resolve } from 'resolve'
import { Range } from 'atom'

function resolveModule(textEditor, module) {
    const basedir = path.dirname(textEditor.getPath())
    const options = {
        basedir,
        extensions: atom.config.get('js-hyperclick.extensions')
    }

    try {
        const filename = resolve(module, options)
        if (filename == module) {
            return `http://nodejs.org/api/${module}.html`
        }
        return filename
    } catch (e) {
        /* do nothing */
    }

    // Allow linking to relative files that don't exist yet.
    if (module[0] === '.') {
        if (path.extname(module) == '') {
            module += '.js'
        }

        return path.join(basedir, module)
    }
}

const scopeSize = ({block: b}) => b.end - b.start

export const isJavascript = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return (scopeName === 'source.js' || scopeName === 'source.js.jsx')
}

function findClosestScope(scopes, start, end) {
    return scopes.reduce((closest, scope) => {
        const { block } = scope

        if (block.start <= start
            && block.end >= end
            && scopeSize(scope) < scopeSize(closest)
        ) {
            return scope
        }

        return closest
    })
}

const find = (ar, cb) => ar.filter(cb)[0]


function moduleResult({module, imported}, textEditor, range, cache) {
    return {
        range,
        callback() {
            // ctrl+click creates multiple cursors. This will remove all but the
            // last one to simulate cursor movement instead of creation.
            const lastCursor = textEditor.getLastCursor()
            textEditor.setCursorBufferPosition(lastCursor.getBufferPosition())

            const filename = resolveModule(textEditor, module)

            if (filename == null) {
                const detail = `module ${module} was not found`

                atom.notifications.addWarning("js-hyperclick", { detail })
                return
            }

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
                let target = exports[imported]
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

function pathResult(path, textEditor, cache) {
    const module = {
        module: path.module,
        imported: 'default',
    }

    const range = new Range(
        textEditor.getBuffer().positionForCharacterIndex(path.start).toArray(),
        textEditor.getBuffer().positionForCharacterIndex(path.end).toArray()
    )

    return moduleResult(module, textEditor, range, cache)
}

const maybeIdentifier = /^[$0-9\w]+$/
export default function(textEditor, text, range, cache) {
    const { paths, scopes, externalModules } = cache.get(textEditor)
    const start = textEditor.buffer.characterIndexForPosition(range.start)
    const end = textEditor.buffer.characterIndexForPosition(range.end)

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i]
        if (path.start > end) { break }
        if (path.start < start && path.end > end) {
            return pathResult(path, textEditor, cache)
        }
    }

    // Avoid wasting time on symbols
    if (!text.match(maybeIdentifier)) {
        return null
    }


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
            return moduleResult(module, textEditor, range, cache)
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
