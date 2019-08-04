import path from "path"
import { CompositeDisposable, TextEditor } from "atom"
import { Info } from "./ts-types"
import { parseCode } from "./core"
import makeDebug from "debug"
import * as babel from "@babel/core"

const debug = makeDebug("js-hyperclick:make-cache")

export default function cachedParser(subscriptions: CompositeDisposable) {
  const editors = new WeakMap()
  const data: WeakMap<TextEditor, Info> = new WeakMap()
  const configCache: WeakMap<TextEditor, babel.TransformOptions> = new WeakMap()

  function loadBabelConfig(
    editor: TextEditor,
  ): babel.TransformOptions | undefined {
    const editorPath = editor.getPath()
    if (!configCache.has(editor) && editorPath != null) {
      const transformOptions: babel.TransformOptions = {
        babelrc: true,
        root: path.dirname(editorPath),
        rootMode: "upward-optional",
        filename: editor.getPath(),
      }

      try {
        const partialConfig = babel.loadPartialConfig(transformOptions)

        debug("Partial Config", partialConfig)

        if (partialConfig == null || partialConfig.config == null) {
          configCache.delete(editor)
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

  function watchEditor(editor: TextEditor) {
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

      // @ts-ignore - TS thinks it might return null here
      return data.get(editor)
    },
  }
}
