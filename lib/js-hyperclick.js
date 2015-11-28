"use babel"
import { CompositeDisposable } from 'atom'
import makeCache from './make-cache'
import suggestions, { isJavascript } from './suggestions.js'

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)


    return {
        providerName:'js-hyperclick',
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
        }
    },
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
