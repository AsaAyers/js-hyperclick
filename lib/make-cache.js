"use babel"
import { parse, traverse } from 'babel-core'

export function parseCode(code) {
    const ast = {
        type: 'File',
        start: 0,
        end: code.length,
        program: parse(code),
    }

    const scopes = []

    traverse(ast, {
        Scope(node, parent, scope) {
            scopes.push(scope)
        }
    })

    return {
        scopes
    }
}

export default function makeCache(subscriptions) {
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


    return {
        get(editor) {
            watchEditor(editor)
            if (!data.has(editor)) {
                data.set(editor, parseCode(editor.getText()))
            }

            return data.get(editor)
        }
    }
}
