"use babel"
// @flow

export default function matcherHint(
  name: string,
  actual: string,
  expected: string,
  secondArgument?: string = "",
) {
  if (secondArgument !== "") {
    secondArgument = `, ${secondArgument}`
  }

  return `Expected ${actual}${name}(${expected})`
}
