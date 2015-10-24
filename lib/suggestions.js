"use babel"

const scopeSize = ({parentBlock: b}) => b.end - b.start

function findClosestScope(data, start, end) {
    return data.scopes.reduce((closest, scope) => {
        const { parentBlock } = scope

        if (parentBlock.start <= start
            && parentBlock.end >= end
            && scopeSize(scope) < scopeSize(closest)
        ) {
            return scope
        }

        return closest
    })
}

export default function(textEditor, text, range, data) {
    const start = textEditor.buffer.characterIndexForPosition(range.start)
    const end = textEditor.buffer.characterIndexForPosition(range.end)

    const closestScope = findClosestScope(data, start, end)

    if (closestScope.hasBinding(text)) {

        const binding = closestScope.getBinding(text)
        console.log(text, closestScope, binding)
        const { line, column } =  binding.identifier.loc.start

        if (line - 1 == range.start.row && column == range.start.column) {
            return null
        }

        return {
            range,
            callback() {
                textEditor.setCursorBufferPosition([line - 1, column])
                textEditor.scrollToCursorPosition()
            }
        }
    }
}
