"use babel"
import { CompositeDisposable } from 'atom'
import makeCache from './make-cache'
import suggestions, { isJavascript } from './suggestions.js'

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)

    const maybeIdentifier = /^[0-9\w]+$/

    return {
        getSuggestionForWord(textEditor, text, range) {
            if (text.match(maybeIdentifier) && isJavascript(textEditor)) {
                const data = cache.get(textEditor)
                return suggestions(textEditor, text, range, data)
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
