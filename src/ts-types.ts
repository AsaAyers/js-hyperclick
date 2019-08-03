import { Scope } from '@babel/traverse'


// TODO: Remove the nulls. I just added them for compatibility with Babel's
// Node.start and end.
export type Range = {
  start: number,
  end: number,
}

export type Resolved =
  | { type: "url", url: string }
  | { type: "file", filename: string | null | undefined }

type ParseError = {
  type: "parse-error",
  parseError: Error,
}

export type Path = {
  imported: string,
  moduleName: string,
  range: Range,
}

export type ExternalModule = {
  local: string,
  start: number,
  end: number,
  moduleName: string,
  imported: string,
}

export type Info =
  | ParseError
  | {
      type: "info",
      parseError?: typeof undefined,
      exports: {
        [name: string]: Range,
      },
      scopes: Array<Scope>,
      externalModules: Array<ExternalModule>,
      paths: Array<Path>,
    }


export type SuggestionFromImport = {
  type: "from-import",
  moduleName: string,
  imported: string,
  bindingStart: number,
  bindingEnd: number,
}

type BindingSuggestion = {
  type: "binding",
  start: number,
  end: number,
}

export type PathSuggestion = {
  type: "path",
  imported: string,
  moduleName: string,
  range: Range,
}

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