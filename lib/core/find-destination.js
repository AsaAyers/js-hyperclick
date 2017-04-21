

export default function findDestination(info, suggestion) {
    const { exports } = info

    if (suggestion.type === 'binding') {
        return suggestion
    } else if (suggestion.imported) {
        let target = exports[suggestion.imported]
        if (!target) {
            target = exports.default
        }

        return target
    } else {
        throw new Error('Invalid suggestion type')
    }
}
