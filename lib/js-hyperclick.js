"use babel"
import { CompositeDisposable } from 'atom'
import makeCache from './make-cache'
import suggestions, { isJavascript } from './suggestions.js'

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)

    const maybeIdentifier = /^[$0-9\w]+$/

    return {
        getSuggestionForWord(textEditor, text, range) {
            if (text.match(maybeIdentifier) && isJavascript(textEditor)) {
                return suggestions(textEditor, text, range, cache)
            }
        }
    }
}


module.exports = {
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
