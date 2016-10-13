"use babel"
import { CompositeDisposable } from 'atom'
import makeCache from './make-cache'
import suggestions, { isJavascript } from './suggestions.js'

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)

    return {
        providerName:'js-hyperclick',
        wordRegExp: /[$0-9\w]+/g,
        getSuggestionForWord(textEditor, text, range) {
            if (isJavascript(textEditor)) {
                return suggestions(textEditor, text, range, cache)
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
