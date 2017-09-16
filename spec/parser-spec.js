"use babel"
// @flow
/*eslint-env jasmine */
import extractAnnotations from "./utils/extract-annotations"
import { parseCode } from "../lib/core"

describe("parseCode", () => {
  it("parse-error.js reports a parse error", () => {
    const { code } = extractAnnotations("parse-error.js")
    const info = parseCode(code)

    expect(info.parseError).not.toBeUndefined()
  })

  it("es6-module.js does not have a parse error", () => {
    const { code } = extractAnnotations("es6-module.js")
    const info = parseCode(code)

    expect(info.parseError).toBeUndefined()
  })

  it(`Exported flow types/interfaces are captured`, () => {
    const { code } = extractAnnotations("types.js")
    const info = parseCode(code)

    if (info.exports == null) {
      throw info.parseError
    }

    const { Range, Foo } = info.exports

    // export type
    expect(Range).toBeDefined()
    // export interface
    expect(Foo).toBeDefined()
  })

  it("cjs.js does not have a parse error", () => {
    const { code } = extractAnnotations("cjs.js")
    const info = parseCode(code)

    expect(info.parseError).toBeUndefined()
  })

  it(`should not capture dynamic requires, becuase we can't know the moduleName`, () => {
    const { code } = extractAnnotations("cjs.js")
    const info = parseCode(code)

    const config = info.externalModules.find(i => i.local === "config")
    expect(config).toBeUndefined() // because it's a dynamic require
  })
})
