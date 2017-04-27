"use babel"
// @flow

import type { CompositeDisposable, TextEditor } from "atom"
import type { Info } from "./types"
import { parseCode } from "./core"

export default function cachedParser(subscriptions: CompositeDisposable) {
  const editors = new WeakMap()
  const data: WeakMap<TextEditor, Info> = new WeakMap()

  function watchEditor(editor) {
    if (!editors.has(editor)) {
      editors.set(editor, null)
      subscriptions.add(
        editor.onDidStopChanging(() => {
          data.delete(editor)
        }),
      )
    }
  }

  return {
    get(editor: TextEditor): Info {
      watchEditor(editor)
      if (!data.has(editor)) {
        data.set(editor, parseCode(editor.getText()))
      }

      // $FlowExpectError - Flow thinks it might return null here
      return data.get(editor)
    },
  }
}
