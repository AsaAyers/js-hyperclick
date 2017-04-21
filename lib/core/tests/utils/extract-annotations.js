import fs from 'fs'
import path from 'path'

export default function extractAnnotations(name) {
    let fullFilename = name
    if (!path.isAbsolute(fullFilename)) {
        fullFilename = path.join(__dirname, '..', 'fixtures', name)
    }

    const code = String(fs.readFileSync(fullFilename))
    const annotations = {}

    const wordRegExp = /[$0-9\w]+/g
    let charactersToLine = 0
    code.split("\n").forEach((line) => {
        // Capture the last letter of an identifier and the tag that follows it.
        //
        // foo/* foo */
        //   ^ Capture the o and the comment
        // require('./other/module' /* otherModule */)
        //                       ^ Capture the e and the comment
        const pattern = new RegExp(`(${wordRegExp.source})\\W*\\/\\* (\\w+) \\*\\/`, "g")
        let match
        while (match = pattern.exec(line)) { // eslint-disable-line no-cond-assign
            const [ _, text, label ] = match
            void(_)

            if (annotations[label] !== undefined) {
                throw new Error('Duplicate annotation: ' + label)
            }

            annotations[label] = {
                label,
                text,
                start: charactersToLine + match.index,
                end: charactersToLine + match.index + text.length,
            }
        }
        charactersToLine += line.length + 1 /* for the newline */
    })

    return { code, annotations }
}
