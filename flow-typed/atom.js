// @flow
/* eslint-disable no-unused-vars */

declare var atom: Object


declare module 'atom' {
    declare class Disposable {
        dispose(): void;
    }
    declare type Point = {
        toArray: () => [number, number]
    }
    declare class Range {
        start: Point,
        end: Point,
    }
    declare type Buffer = {
        characterIndexForPosition: (position: Point) => number,
        positionForCharacterIndex: (index: number) => any,
        getTextInRange: (range: Range) => string,
    }
    declare class CompositeDisposable{
        add(...observable: Array<Disposable>): void;
        dispose(): void;
    }
    declare type TextEditor = {
        getPath: () => string,
        getGrammar: () => {
            scopeName: string
        },
        getBuffer: () => Buffer,
        setCursorBufferPosition: (point: Point) => void,
        scrollToCursorPosition: () => void,
        getText: () => string,
        onDidStopChanging: (cb: () => void) => any
    }
}
