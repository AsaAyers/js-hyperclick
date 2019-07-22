"use babel"
/*global atom */
// @flow
import type { TextEditor } from "atom"
import type { Range, Resolved } from "./types"
import createDebug from "debug"

import { CompositeDisposable } from "atom"
import { Range as AtomRange } from "atom"
import shell from "shell"
import makeCache from "./make-cache"
import { buildSuggestion, findDestination, resolveModule } from "./core"
import fs from "fs"
import makeRequire from "./require-if-trusted"
import type { Require } from "./require-if-trusted"

const debug = createDebug("js-hyperclick")

const scopes = ["source.js", "source.js.jsx", "javascript", "source.flow"]
const isJavascript = (textEditor: TextEditor) => {
  const { scopeName } = textEditor.getGrammar()

  if (scopes.indexOf(scopeName) >= 0) {
    return true
  }
  debug("Not Javascript", scopeName)
  return false
}

function makeProvider(subscriptions) {
  const cache = makeCache(subscriptions)
  let automaticJumpCounter = 0

  const automaticJump = (textEditor, { start, end }: Range) => {
    if (!atom.config.get("js-hyperclick.skipIntermediate")) {
      return
    }

    if (automaticJumpCounter++ > 10) {
      const detail = `Unable to find origin: too many jumps`
      atom.notifications.addWarning("js-hyperclick", { detail })
      return
    }

    const buffer = textEditor.getBuffer()
    const nextInfo = cache.get(textEditor)
    const range = new AtomRange(
      // I know this works, but flow claims the type is wrong - $FlowFixMe
      buffer.positionForCharacterIndex(start).toArray(),
      buffer.positionForCharacterIndex(end).toArray(),
    )
    const text = buffer.getTextInRange(range)

    const options = {
      jumpToImport: atom.config.get("js-hyperclick.jumpToImport"),
    }

    const nextSuggestion = buildSuggestion(
      nextInfo,
      text,
      { start, end },
      options,
    )

    let result
    if (nextSuggestion) {
      if (options.jumpToImport && nextSuggestion.type === "from-import") {
        return
      }

      result = buildResult(textEditor, range, nextSuggestion, true)
    }
    if (result) {
      result.callback()
    }
  }

  const navigateToSuggestion = (textEditor, suggestion) => {
    const info = cache.get(textEditor)
    const target = findDestination(info, suggestion)

    if (target) {
      const buffer = textEditor.getBuffer()
      const position = buffer.positionForCharacterIndex(target.start)
      textEditor.setCursorBufferPosition(position)
      textEditor.scrollToCursorPosition()

      automaticJump(textEditor, target)
    }
  }

  const followSuggestionPath = (fromFile, suggestion) => {
    let blockNotFoundWarning = false
    const requireIfTrusted: Require<() => ?Resolved> = makeRequire(
      isTrusted => {
        if (isTrusted) {
          followSuggestionPath(fromFile, suggestion)
        }

        blockNotFoundWarning = true
        return () => undefined
      },
    )
    const resolveOptions = {
      extensions: atom.config.get("js-hyperclick.extensions"),
      requireIfTrusted,
    }
    debug("resolveOptions", resolveOptions)
    const resolved = resolveModule(fromFile, suggestion, resolveOptions)

    if (blockNotFoundWarning) {
      // Do nothing
    } else if (resolved.type === "url") {
      if (atom.packages.isPackageLoaded("web-browser")) {
        atom.workspace.open(resolved.url)
      } else {
        // flow insisted resolved.url may be undefined here, so I had to
        // switch to a local variable.
        shell.openExternal(resolved.url)
      }
    } else if (resolved.type === "file") {
      let filename = resolved.filename

      if (filename == null) {
        const detail = `module ${suggestion.moduleName} was not found`
        atom.notifications.addWarning("js-hyperclick", { detail })
        return
      }

      if (fs.existsSync(filename)) {
        filename = fs.realpathSync(filename)
      }
      const options = {
        pending: atom.config.get("js-hyperclick.usePendingPanes"),
      }
      atom.workspace.open(filename, options).then(editor => {
        navigateToSuggestion(editor, suggestion)
      })
    } else {
      // Verify all types have been handled
      ;(resolved.type: empty)
    }
  }

  function buildResult(textEditor, range, suggestion, isAutomaticJump = true) {
    if (!isJavascript(textEditor)) {
      return
    }
    if (suggestion.range) {
      const buffer = textEditor.getBuffer()

      range = new AtomRange(
        // I know this works, but flow claims the type s wrong - $FlowFixMe
        buffer.positionForCharacterIndex(suggestion.range.start).toArray(),
        buffer.positionForCharacterIndex(suggestion.range.end).toArray(),
      )
    }

    return {
      range,
      callback() {
        if (!isAutomaticJump) {
          automaticJumpCounter = 0
        }

        if (suggestion.type === "binding") {
          navigateToSuggestion(textEditor, suggestion)
        } else {
          followSuggestionPath(textEditor.getPath(), suggestion)
        }
      },
    }
  }

  return {
    providerName: "js-hyperclick",
    wordRegExp: /[$0-9\w]+/g,
    priority: atom.config.get("js-hyperclick.priority"),
    getSuggestionForWord(
      textEditor: TextEditor,
      text: string,
      range: AtomRange,
    ) {
      if (isJavascript(textEditor)) {
        const info = cache.get(textEditor)
        if (info.parseError) return

        const buffer = textEditor.getBuffer()
        const start = buffer.characterIndexForPosition(range.start)
        const end = buffer.characterIndexForPosition(range.end)

        const options = {
          jumpToImport: atom.config.get("js-hyperclick.jumpToImport"),
        }
        const suggestion = buildSuggestion(info, text, { start, end }, options)
        debug(text, suggestion)
        if (suggestion) {
          return buildResult(textEditor, range, suggestion, false)
        }
      }
    },
  }
}

function migrateTrustedResolvers() {
  const key = `js-hyperclick.trustedResolvers`
  const trustedResolvers = atom.config.get(key)
  if (trustedResolvers != null) {
    atom.config.set("js-hyperclick.trustedFiles", trustedResolvers)
    atom.config.set(key, undefined)
  }
}

module.exports = {
  config: {
    extensions: {
      description:
        "Comma separated list of extensions to check for when a file isn't found",
      type: "array",
      // Default comes from Node's `require.extensions`
      default: [".js", ".json", ".node"],
      items: { type: "string" },
    },
    usePendingPanes: {
      type: "boolean",
      default: false,
    },
    jumpToImport: {
      type: "boolean",
      default: false,
      description: `
        Jump to the import statement instead of leaving the current file.
        You can still click the import to switch files.
        `.trim(), // if the description starts with whitespace it doesn't display
    },
    skipIntermediate: {
      type: "boolean",
      default: true,
      title: `Jump through intermediate links`,
      description: `
        When you land at your destination, js-hyperclick checks to see if
        that is a link and then follows it. This is mostly useful to skip
        over files that \`export ... from './otherfile'\`. You will land in
        \`./otherfile\` instead of at that export.
        `.trim(),
    },
    priority: {
      type: "number",
      default: 0,
      title: `hyperclick priority`,
      description: `
        Hyperclick only returns suggestions from a single provider, so this is a
        workaround for providers to override others. priority defaults to 0.
        https://atom.io/packages/hyperclick
        `.trim(),
    },
    // This doesn't show up in the settings. Use Edit > Config if you need to
    // change this.
    // trustedFiles: {
    //   type: "array",
    //   items: {
    //     type: "object",
    //     properties: {
    //       hash: { type: "string" },
    //       trusted: { type: "boolean" },
    //     },
    //   },
    //   default: [],
    // },
  },
  activate() {
    // hyperclick is bundled into nuclide
    if (!atom.packages.isPackageLoaded("hyperclick")) {
      require("atom-package-deps").install("js-hyperclick")
    }
    migrateTrustedResolvers()
    debug("activate")
    this.subscriptions = new CompositeDisposable()
  },
  getProvider() {
    return makeProvider(this.subscriptions)
  },
  deactivate() {
    debug("deactivate")
    this.subscriptions.dispose()
  },
}

global.jsHyperclick = module.exports
