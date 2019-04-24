"use babel"
// @flow

import path from "path"
import fs from "fs"
import type { CompositeDisposable, TextEditor } from "atom"
import type { Info } from "./types"
import { parseCode } from "./core"
import makeDebug from "debug"
import makeRequire from "./require-if-trusted"

const debug = makeDebug("js-hyperclick:make-cache")

function findFile(basedir, filenames) {
  for (let i = 0; i < filenames.length; i++) {
    try {
      const absolutePath = path.resolve(basedir, filenames[i])
      fs.accessSync(absolutePath)
      return absolutePath
    } catch (e) {
      // Skip this file, it probably doesn't exist
    }
  }

  const parent = path.resolve(basedir, "../")
  if (parent != basedir) {
    return findFile(parent, filenames)
  }
  return undefined
}

export default function cachedParser(subscriptions: CompositeDisposable) {
  const editors = new WeakMap()
  const data: WeakMap<TextEditor, Info> = new WeakMap()
  const configCache: WeakMap<TextEditor, ?Object> = new WeakMap()

  function findConfigFile(editor: TextEditor) {
    const basedir = path.dirname(editor.getPath())
    // "New in Babel 7.x, Babel has as concept of a "root" directory, which
    // defaults to the current working directory"
    // https://babeljs.io/docs/en/config-files#project-wide-configuration
    //
    // The current working directory doesn't work well for `js-hyperclick`
    // because you might launch Atom from anywhere and you can add multiple
    // projects at once.
    let configPath = findFile(basedir, ["babel.config.js"])
    if (configPath == null) {
      configPath = findFile(basedir, [".babelrc", ".babelrc.js"])
    }

    if (configPath != null) {
      const basedir = path.dirname(configPath)
      const packagePath = findFile(basedir, ["package.json"])
      if (packagePath != null) {
        let packageJson
        try {
          packageJson = JSON.parse(String(fs.readFileSync(packagePath)))
        } catch (e) {
          // do nothing
        }
        if (packageJson != null) {
          const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          }
          const babelVersion =
            dependencies["babel-core"] || dependencies["@babel/core"]
          if (babelVersion) {
            // Strep anything that's not a digit, I only need the firt number
            const major = babelVersion.replace(/\D/, "")
            if (major[0] === "6") {
              debug("Skipping Babel 6 config")
              // Do not accept a config from a Babel6 project
              configPath = null
            }
          }
        }
      }
    }

    return configPath
  }

  function loadBabelConfig(editor) {
    if (!configCache.has(editor)) {
      let babelConfig: ?Object = undefined
      const configPath = findConfigFile(editor)
      if (configPath != null) {
        debug("loadBabelConfig", configPath)
        try {
          if (path.extname(configPath) === ".js") {
            const dontCache = {}

            const requireIfTrusted = makeRequire(trusted => {
              if (trusted === false) {
                return undefined
              }
              if (trusted === true) {
                data.delete(editor)
                configCache.delete(editor)
              }

              return dontCache
            })

            // $FlowExpectError
            const cfg = requireIfTrusted(configPath)
            debug("cfg", cfg)

            babelConfig = typeof cfg === "function" ? cfg() : cfg
            if (babelConfig === dontCache) {
              return undefined
            }
          } else {
            babelConfig = JSON.parse(String(fs.readFileSync(configPath)))
          }

          if (babelConfig) {
            // cwd can't be added to babel.config.js
            if (path.basename(configPath) !== "babel.config.js") {
              babelConfig.cwd = babelConfig.cwd || path.dirname(configPath)
            }
            const babel = require("@babel/core")
            babelConfig = babel.loadOptions(babelConfig)
          }
        } catch (e) {
          debug("loadBabelConfig error", e)
        }
        debug("babel config", babelConfig)
      }
      configCache.set(editor, babelConfig)
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
