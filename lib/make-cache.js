"use babel"
// @flow

import path from "path"
import type { CompositeDisposable, TextEditor } from "atom"
import type { Info } from "./types"
import { parseCode } from "./core"
import makeDebug from "debug"

const debug = makeDebug("js-hyperclick:make-cache")

export default function cachedParser(subscriptions: CompositeDisposable) {
  const editors = new WeakMap()
  const data: WeakMap<TextEditor, Info> = new WeakMap()
  const configCache: WeakMap<TextEditor, ?Object> = new WeakMap()

  function loadBabelConfig(editor) {
    if (!configCache.has(editor)) {
      const babel = require("@babel/core")
      const transformOptions = {
        babelrc: true,
        root: path.dirname(editor.getPath()),
        rootMode: "upward-optional",
        filename: editor.getPath(),
      }

      try {
        const partialConfig = babel.loadPartialConfig(transformOptions)

        debug("Partial Config", partialConfig)

        if (partialConfig.config == null) {
          configCache.set(editor, undefined)
        } else {
          configCache.set(editor, partialConfig.options)
        }
      } catch (e) {
        debug("Error loading config")
        debug(e)
      }
    }
    return configCache.get(editor)
  }

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
        data.set(editor, parseCode(editor.getText(), loadBabelConfig(editor)))
      }

      // $FlowExpectError - Flow thinks it might return null here
      return data.get(editor)
    },
  }
}
