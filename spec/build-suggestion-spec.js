"use babel"
// @flow
/*eslint-env jasmine */
import type { Suggestion } from "../lib/types"
import extractAnnotations from "./utils/extract-annotations"
import findLocation from "./utils/find-location"
import { parseCode, buildSuggestion, findDestination } from "../lib/core"
import diff from "jest-diff"
import matcherHint from "./utils/matcher-hint"

const buildExpectations = filename =>
  function() {
    const spec = this
    const { code, annotations } = extractAnnotations(filename)
    const info = parseCode(code)
    const runner = (name): ?Suggestion => {
      if (annotations[name]) {
        const { text, start, end } = annotations[name]
        return buildSuggestion(info, text, { start, end })
      }
    }

    spec.addMatchers({
      toLinkToModule([moduleName, imported = "default"]) {
        const startAnnotation = this.actual
        const actual = runner(startAnnotation)
        const pass =
          actual != null &&
          actual.moduleName === moduleName &&
          actual.imported === imported

        this.message = () => {
          let str =
            matcherHint(
              (pass ? ".not" : "") + ".toLinkToModule",
              startAnnotation,
              moduleName,
              imported,
            ) + "\n\n"

          if (annotations[startAnnotation] == null) {
            str += `Annotation ${startAnnotation} not found\n`
          } else if (actual == null || actual.type === "binding") {
            str += `Annotation ${startAnnotation} is not a link.\n`
          } else if (!pass) {
            const diffString = diff(
              { moduleName, imported },
              { moduleName: actual.moduleName, imported: actual.imported },
            )
            str += `Difference:\n\n${diffString}`
          }

          return str
        }

        return pass
      },
      toBeALink() {
        const startAnnotation = this.actual
        const actual = runner(startAnnotation)

        const pass = annotations[startAnnotation] != null && actual != null

        this.message = () => {
          let str =
            (pass
              ? matcherHint(".not.toBeALink", startAnnotation, "")
              : matcherHint(".toBeALink", startAnnotation, "")) + "\n\n"

          if (annotations[startAnnotation] == null) {
            str += `Annotation ${startAnnotation} not found\n`
          } else if (actual == null) {
            str += `Destination not found`
          } else if (typeof actual.start !== "undefined") {
            str += `Actually jumped to:\n`
            str += `${findLocation(code, actual.start)}\n`
          }

          return str
        }

        return pass
      },
      toJumpTo(endAnnotation) {
        const startAnnotation = this.actual
        const suggestion = runner(startAnnotation)
        const actual = findDestination(info, suggestion)
        const expected = annotations[endAnnotation] || {}

        const pass = actual != null && actual.start === expected.start

        this.message = () => {
          let str =
            (pass
              ? matcherHint(".not.toJumpTo", startAnnotation, endAnnotation)
              : matcherHint(".toJumpTo", startAnnotation, endAnnotation)) +
            "\n\n"

          if (expected.start == null) {
            str += `Annotation ${endAnnotation} not found\n`
          } else {
            str += `Expected ${pass ? "not " : ""}to jump to:\n`
            str += `${findLocation(code, expected.start)}\n`
          }

          if (actual == null) {
            str += `Annotation ${startAnnotation} not found\n`
          } else if (!pass) {
            str += `Actually jumped to:\n`
            str += `${findLocation(code, actual.start)}\n`
          }

          return str
        }

        return pass
      },
    })
  }

describe("buildSuggestion", () => {
  describe("es6-module.js", () => {
    beforeEach(buildExpectations("es6-module.js"))

    it(`var/const/let/function declarations don't have a destination`, () => {
      expect("testVar").not.toBeALink()
      expect("testConst").not.toBeALink()
      expect("testLet").not.toBeALink()
      expect("functionDeclaration").not.toBeALink()
    })

    it(`variables (var/let/const) jump to their definitions`, () => {
      expect("log_testVar").toJumpTo("testVar")
      expect("log_testConst").toJumpTo("testConst")
      expect("log_testLet").toJumpTo("testLet")
    })

    it(`clicking a function parameter jumps to its definition`, () => {
      expect("log_param1").toJumpTo("param1")
    })

    it(`function declarations work inside and out`, () => {
      expect(`log_functionDeclaration`).toJumpTo("functionDeclaration")
      expect(`log2_functionDeclaration`).toJumpTo("functionDeclaration")
    })

    it(`destructuring works on params and variables`, () => {
      expect("log_dstrP1").toJumpTo("dstrP1")
      expect("log_dstrP2").toJumpTo("dstrP2")
      expect("log_dstrC1").toJumpTo("dstrC1")
      expect("log_dstrC2").toJumpTo("dstrC2")
    })

    it(`imported variables link to other modules`, () => {
      expect("otherDefault").toLinkToModule(["./other"])
      expect("log_otherDefault").toLinkToModule(["./other"])

      expect("otherNamed").toLinkToModule(["./other", "otherNamed"])
      expect("log_otherNamed").toLinkToModule(["./other", "otherNamed"])

      expect("renamed").toLinkToModule(["./other", "otherNamed2"])
      expect("log_renamed").toLinkToModule(["./other", "otherNamed2"])
    })

    it(`Renamed imports are links`, () => {
      expect("otherNamed2").toLinkToModule(["./other", "otherNamed2"])
    })

    it(`exporting existing variables makes them links`, () => {
      expect(`export_testConst`).toJumpTo("testConst")
    })

    it(`export ... from statements are links`, () => {
      expect(`namedExportFrom`).toLinkToModule([
        "./exportFrom",
        "namedExportFrom",
      ])
      expect(`exportStar`).toLinkToModule(["./exportStar.js"])
      expect(`defaultExportFrom`).toLinkToModule(["./exportFrom"])
    })

    it(`keywords are not links`, () => {
      expect("if").not.toBeALink()
    })
  })

  describe("cjs.js", () => {
    beforeEach(buildExpectations("cjs.js"))

    it(`require() are supported`, () => {
      expect("basicRequire").toLinkToModule(["./basicRequire", "default"])
    })

    it(`require.resolve() are supported`, () => {
      expect("resolve").toLinkToModule(["./basicRequire", "default"])
    })

    it(`destructuring does not link to named exports`, () => {
      expect("destructured").toLinkToModule(["./destructured", "default"])
      expect("renamed").toLinkToModule(["./renamed", "default"])
    })

    it(`module.exports = require(...) is a link`, () => {
      expect("exports").toLinkToModule(["./es6-module"])
    })
  })
})
