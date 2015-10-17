const myName = 'Asa'
function greeting(name) {

    return "Hello " + name + "."
}

greeting(myName)



"use babel"
import { CompositeDisposable } from 'atom'
import { parse, traverse } from 'babel-core'

global.traverse = traverse

function makeCache(subscriptions) {
    const editors = new WeakMap()
    const data = new WeakMap()

    function watchEditor(editor) {
        if (!editors.has(editor)) {
            editors.set(editor, null)
            subscriptions.add(editor.onDidStopChanging(() => {
                data.delete(editor)
            }))
        }
    }

    function parseEditor(editor) {
        const code = editor.getText()
        const ast = {
            type: 'File',
            start: 0,
            end: code.length,
            program: parse(code),
        }

        const scopes = []

        traverse(ast, {
            Scope: {
                enter(node, parent, scope) {
                    scopes.push(scope)
                }
            }
        })

        return {
            scopes
        }
    }

    return {
        get(editor) {
            watchEditor(editor)
            if (!data.has(editor)) {
                data.set(editor, parseEditor(editor))
            }

            return data.get(editor)
        }
    }
}

const scopeSize = ({parentBlock: b}) => b.end - b.start

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)

    const maybeIdentifier = /^[0-9\w]+$/

    return {
        getSuggestionForWord(textEditor, text, range) {
            const start = textEditor.buffer.characterIndexForPosition(range.start)
            const end = textEditor.buffer.characterIndexForPosition(range.end)

            if (text.match(maybeIdentifier)) {
                const data = cache.get(textEditor)

                const closestScope = data.scopes.reduce((closest, scope) => {
                    const { parentBlock } = scope

                    if (parentBlock.start <= start
                        && parentBlock.end >= end
                        && scopeSize(scope) < scopeSize(closest)
                    ) {
                        return scope
                    }

                    return closest
                })

                if (closestScope.hasBinding(text)) {
                    const binding = closestScope.getBinding(text)
                    const { line, column } =  binding.identifier.loc.start

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
        }
    }
}


module.exports = {
    activate(state) {
        this.subscriptions = new CompositeDisposable()
    },
    getProvider() {
        return makeProvider(this.subscriptions)
    },
    deactivate() {
        this.subscriptions.dispose()
    }
}
