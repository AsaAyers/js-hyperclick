import { Info, Range, Suggestion, SuggestionOptions } from "../ts-types"
import { Scope } from '@babel/traverse'
import { toRange } from './parse-code'

const scopeSize = ({ block: b }: Scope) => (
  b.end != null &&
  b.start != null &&
  b.end - b.start
) || 0

function findClosestScope(scopes: Scope[], start: number, end: number) {
  return scopes.reduce((closest, scope) => {
    const { block } = scope

    if (
      block.start != null &&
      block.end != null &&
      block.start <= start &&
      block.end >= end &&
      scopeSize(scope) < scopeSize(closest)
    ) {
      return scope
    }

    return closest
  })
}

export default function buildSuggestion(
  info: Info,
  text: string,
  { start, end }: Range,
  options: SuggestionOptions = {},
): null | Suggestion {
  if (info.parseError) throw info.parseError
  const { paths, scopes, externalModules } = info

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    if (path.range.start > end) {
      break
    }
    if (path.range.start <= start && path.range.end >= end) {
      if (path.imported !== "default") {
        return {
          type: "from-import",
          imported: path.imported,
          moduleName: path.moduleName,
          bindingStart: path.range.start,
          bindingEnd: path.range.end,
        }
      }

      return {
        type: "path",
        imported: path.imported,
        moduleName: path.moduleName,
        range: path.range,
      }
    }
  }

  const closestScope = findClosestScope(scopes, start, end)
  // Sometimes it reports it has a binding, but it can't actually get the
  // binding
  if (closestScope.hasBinding(text) && closestScope.getBinding(text)) {
    const binding = closestScope.getBinding(text)
    if (binding == null) {
      return null
    }
    const { start: bindingStart, end: bindingEnd } = toRange(binding.identifier.start, binding.identifier.end)

    const clickedDeclaration = bindingStart <= start && bindingEnd >= end
    const crossFiles = !options.jumpToImport

    if (clickedDeclaration || crossFiles) {
      const targetModule = externalModules.find(m => {
        const { start: bindingStart } = binding.identifier
        return m.local == text && m.start == bindingStart
      })

      if (targetModule) {
        return {
          type: "from-import",
          imported: targetModule.imported,
          moduleName: targetModule.moduleName,
          bindingStart,
          bindingEnd,
        }
      }
    }

    // Exit early if you clicked on where the variable is declared
    if (clickedDeclaration) {
      return null
    }

    return {
      type: "binding",
      start: bindingStart,
      end: bindingEnd,
    }
  }

  return null
}
