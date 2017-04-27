// @flow

export type Range = {|
  start: number,
  end: number,
|}

export type Resolved =
  | {| type: "url", url: string |}
  | {| type: "file", filename: ?string |}

type ExternalModule = {|
  local: string,
  start: number,
  end: number,
  moduleName: string,
  imported: string,
|}

export type SuggestionFromImport = {|
  type: "from-import",
  moduleName: string,
  imported: string,
  bindingStart: number,
  bindingEnd: number,
|}

type BindingSuggestion = {|
  type: "binding",
  start: number,
  end: number,
|}

export type PathSuggestion = {|
  type: "path",
  imported: string,
  moduleName: string,
  range: Range,
|}

export type Suggestion =
  | SuggestionFromImport
  | BindingSuggestion
  | PathSuggestion

export type SuggestionOptions = {
  // This can't be an exact type because buildSuggestion has a default value
  // of `{}`. I don't know why Flow inists the two are incompatible when
  // `jumpToImport` is optional.
  jumpToImport?: boolean,
}

type Path = {|
  imported: string,
  moduleName: string,
  range: Range,
|}

type Binding = {|
  identifier: Range,
|}

type BabelScope = {|
  block: Range,
  hasBinding: string => boolean,
  getBinding: string => Binding,
|}

type ParseError = {|
  parseError: Error,
|}
export type Info =
  | ParseError
  | {
      parseError?: typeof undefined,
      exports: {
        [string]: Range,
      },
      scopes: Array<BabelScope>,
      externalModules: Array<ExternalModule>,
      paths: Array<Path>,
    }
