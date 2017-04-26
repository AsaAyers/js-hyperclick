// @flow


export type Range = {
    start: number,
    end: number,
}


export type Resolved = {
    url?: string,
    filename?: string,
}

export type Destination = {|
    start: number,
    end: number,
|}

type ExternalModule = {
    local: string,
    start: number,
    end: number,
    moduleName: string,
    imported: string,
}

type SuggestionFromImport = {|
    type: 'from-import',
    moduleName: string,
    imported: string,
    bindingStart: number,
    bindingEnd: number,
|}

type BindingSuggestion = {|
    type: 'binding',
    start: number,
    end: number,
    moduleName: typeof undefined,
|}

type PathSuggestion = {|
    type: 'path',
    imported: string,
    moduleName: string,
    range: Range,
|}

export type Suggestion =
    | SuggestionFromImport
    | BindingSuggestion
    | PathSuggestion

type Path = {
    imported: string,
    moduleName: string,
    range: Range,
}

type Binding = {|
    identifier: Range,
|}
type BabelScope = {|
    block: Range,
    hasBinding: (string) => boolean,
    getBinding: (string) => Binding
|}

type ParseError = {
    parseError: Error
}
export type Info = ParseError | {
    parseError?: typeof undefined,
    exports: {
        [string]: Destination
    },
    scopes: Array<BabelScope>,
    externalModules: Array<ExternalModule>,
    paths: Array<Path>,
}
