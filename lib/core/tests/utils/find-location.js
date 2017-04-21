const whitespace = (n) => Array(n+1).fill(null).join(' ')

export default function findLocation(code, target) {
    let i = target
    let lineNumber = 1

    const lines = code.split("\n")
    const targetLine = lines.find(line => {
        if ((1 + line.length) < i) {
            i -= (1 + line.length)
            lineNumber++
            return false
        }
        return true
    })

    const prefix = `${lineNumber}: `

    return `${prefix}${targetLine}\n${whitespace(i + prefix.length)}^`
}
