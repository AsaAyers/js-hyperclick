"use babel"
import { CompositeDisposable } from 'atom'
import makeCache from './make-cache'
import suggestions, { isJavascript } from './suggestions.js'

function makeProvider(subscriptions) {
    const cache = makeCache(subscriptions)


    return {
        getSuggestionForWord(textEditor, text, range) {
            if (isJavascript(textEditor)) {
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
