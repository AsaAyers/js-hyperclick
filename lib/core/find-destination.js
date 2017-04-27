"use babel"
// @flow

import type { Info, Suggestion, Range } from "../types"

export default function findDestination(
  info: Info,
  suggestion: ?Suggestion,
): Range {
  if (!suggestion) throw new Error("suggestion required")
  if (info.parseError) throw info.parseError
  const { exports } = info

  if (suggestion.type === "binding") {
    return {
      start: suggestion.start,
      end: suggestion.end,
    }
  } else if (suggestion.imported) {
    let target = exports[suggestion.imported]
    if (!target) {
      target = exports.default
    }

    return target
  } else {
    throw new Error("Invalid suggestion type")
  }
}
