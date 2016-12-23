"use babel"

import { parseCode } from 'js-hyperclick-core'

export default function cachedParser(subscriptions) {
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
