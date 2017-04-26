// @flow
import type { Range } from 'atom'

type Buffer = {
    characterIndexForPosition: (position: Range) => number,
    positionForCharacterIndex: (index: number) => any,
    getTextInRange: (range: Range) => string,
}

type Point = {
    toArray: () => [number, number]
}

export type TextEditor = {
    getPath: () => string,
    getGrammar: () => {
        scopeName: string
    },
    getBuffer: () => Buffer,
    buffer: Buffer,
    setCursorBufferPosition: (point: Point) => void,
    scrollToCursorPosition: () => void,
    getText: () => string,
    onDidStopChanging: (cb: () => void) => any
}
