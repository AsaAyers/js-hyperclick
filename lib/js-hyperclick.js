"use babel"
/*global atom */
import { CompositeDisposable } from 'atom'
import { Range } from 'atom'
import shell from 'shell'
import makeCache from './make-cache'
import { buildSuggestion, findDestination, resolveModule } from 'js-hyperclick-core'

const isJavascript = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return (scopeName === 'source.js' || scopeName === 'source.js.jsx')
}

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)
    let automaticJumpCounter = 0

    const automaticJump = (textEditor, { start, end }) => {
        if (!atom.config.get('js-hyperclick.skipIntermediate')) {
            return
        }

        if (automaticJumpCounter++ > 10) {
            const detail = `Unable to find origin: too many jumps`
            atom.notifications.addWarning("js-hyperclick", { detail })
            return
        }

        const buffer = textEditor.getBuffer()
        const nextInfo = cache.get(textEditor)
        const range = new Range(
            buffer.positionForCharacterIndex(start).toArray(),
            buffer.positionForCharacterIndex(end).toArray()
        )
        const text = buffer.getTextInRange(range)

        const options = {
            jumpToImport: atom.config.get('js-hyperclick.jumpToImport')
        }

        const nextSuggestion = buildSuggestion(nextInfo, text, { start, end }, options)

        let result
        if (nextSuggestion) {
            if (options.jumpToImport && nextSuggestion.type === 'from-import') {
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
        const resolveOptions = {
            extensions: atom.config.get('js-hyperclick.extensions'),
        }
        const resolved = resolveModule(fromFile, suggestion, resolveOptions)

        if (resolved.url) {
            if (atom.packages.isPackageLoaded('web-browser')) {
                atom.workspace.open(resolved.url)
            } else {
                shell.openExternal(resolved.url)
            }
            return
        }

        if (resolved.filename == null) {
            const detail = `module ${suggestion.moduleName} was not found`

            atom.notifications.addWarning("js-hyperclick", { detail })
            return
        }

        const options = {
            pending: atom.config.get('js-hyperclick.usePendingPanes')
        }
        atom.workspace.open(resolved.filename, options).then((editor) => {
            navigateToSuggestion(editor, suggestion)
        })
    }


    function buildResult(textEditor, range, suggestion, isAutomaticJump = true) {
        if (!isJavascript(textEditor)) {
            return
        }
        if (suggestion.range) {
            const buffer = textEditor.getBuffer()

            range = new Range(
                buffer.positionForCharacterIndex(suggestion.range.start).toArray(),
                buffer.positionForCharacterIndex(suggestion.range.end).toArray()
            )
        }

        return {
            range,
            callback() {
                if (!isAutomaticJump) {
                    automaticJumpCounter = 0
                }

                if (suggestion.type === 'binding') {
                    navigateToSuggestion(textEditor, suggestion)
                } else {
                    followSuggestionPath(textEditor.getPath(), suggestion)
                }
            }
        }
    }

    return {
        providerName:'js-hyperclick',
        wordRegExp: /[$0-9\w]+/g,
        getSuggestionForWord(textEditor, text, range) {
            if (isJavascript(textEditor)) {
                const info = cache.get(textEditor)
                const start = textEditor.buffer.characterIndexForPosition(range.start)
                const end = textEditor.buffer.characterIndexForPosition(range.end)

                const options = {
                    jumpToImport: atom.config.get('js-hyperclick.jumpToImport')
                }
                const suggestion = buildSuggestion(info, text, { start, end }, options)
                if (suggestion) {
                    return buildResult(textEditor, range, suggestion, false)
                }
            }
        }
    }
}

module.exports = {
    config: {
        extensions: {
            description: "Comma separated list of extensions to check for when a file isn't found",
            type: 'array',
            // Default comes from Node's `require.extensions`
            default: [ '.js', '.json', '.node' ],
            items: { type: 'string' },
        },
        usePendingPanes: {
            type: 'boolean',
            default: false,
        },
        jumpToImport: {
            type: 'boolean',
            default: false,
            description: `
            Jump to the import statement instead of leaving the current file.
            You can still click the import to switch files.
            `.trim() // if the description starts with whitespace it doesn't display
        },
        skipIntermediate: {
            type: 'boolean',
            default: true,
            title: `Jump through intermediate links`,
            description: `
            When you land at your destination, js-hyperclick checks to see if
            that is a link and then follows it. This is mostly useful to skip
            over files that \`export ... from './otherfile'\`. You will land in
            \`./otherfile\` instead of at that export.
            `.trim()
        }
    },
    activate() {
        this.subscriptions = new CompositeDisposable()
    },
    getProvider() {
        return makeProvider(this.subscriptions)
    },
    deactivate() {
        this.subscriptions.dispose()
    }
}
