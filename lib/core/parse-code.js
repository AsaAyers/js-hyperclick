"use babel"
// @flow
import type { Info } from "../types"
import makeDebug from "debug"
const debug = makeDebug("js-hyperclick:parse-code")

// TimeCop was reporting that it took over 600ms for js-hyperclick to start.
// Converting this `import` to a `require` reduced it to under 250ms Moving it
// to require inside `findIdentifiers` and `parseCode` moved it off the TimeCop
// list (under 5ms)

/*
import { parse, traverse, types as t } from '@babel/core'
*/

const parseErrorTag = Symbol()

const identifierReducer = (tmp, node) => {
  let value = node
  if (node.value) {
    value = node.value
  }
  const { types: t } = require("@babel/core")
  let newIdentifiers
  if (t.isIdentifier(value)) {
    newIdentifiers = [value]
  } else if (t.isObjectPattern(value)) {
    newIdentifiers = findIdentifiers(value)
  } else if (t.isArrayPattern(value)) {
    newIdentifiers = findIdentifiers(value)
  }

  /* istanbul ignore next: If this throws, it's a mistake in my code or an
    /* unsupported syntax */
  if (!newIdentifiers) {
    throw new Error("No identifiers found")
  }

  return [...tmp, ...newIdentifiers]
}
function findIdentifiers(node, identifiers = []) {
  const { types: t } = require("@babel/core")

  if (t.isObjectPattern(node)) {
    return node.properties.reduce(identifierReducer, identifiers)
  } else if (t.isArrayPattern(node)) {
    return node.elements.reduce(identifierReducer, identifiers)
  } else if (t.isIdentifier(node)) {
    return [node]
  }
  /* istanbul ignore next */
  throw new Error("Unknown node type")
}

const makeDefaultConfig = () => ({
  sourceType: "module",
  // Enable as many plugins as I can so that people don't need to configure
  // anything.
  plugins: [
    require("@babel/plugin-syntax-async-generators"),
    require("@babel/plugin-syntax-bigint"),
    require("@babel/plugin-syntax-class-properties"),
    [
      require("@babel/plugin-syntax-decorators"),
      { decoratorsBeforeExport: false },
    ],
    require("@babel/plugin-syntax-do-expressions"),
    require("@babel/plugin-syntax-dynamic-import"),
    require("@babel/plugin-syntax-export-default-from"),
    require("@babel/plugin-syntax-export-namespace-from"),
    require("@babel/plugin-syntax-flow"),
    require("@babel/plugin-syntax-function-bind"),
    require("@babel/plugin-syntax-function-sent"),
    require("@babel/plugin-syntax-import-meta"),
    require("@babel/plugin-syntax-json-strings"),
    require("@babel/plugin-syntax-jsx"),
    require("@babel/plugin-syntax-logical-assignment-operators"),
    require("@babel/plugin-syntax-nullish-coalescing-operator"),
    require("@babel/plugin-syntax-numeric-separator"),
    require("@babel/plugin-syntax-object-rest-spread"),
    require("@babel/plugin-syntax-optional-catch-binding"),
    require("@babel/plugin-syntax-optional-chaining"),
    [
      require("@babel/plugin-syntax-pipeline-operator"),
      { proposal: "minimal" },
    ],
    require("@babel/plugin-syntax-throw-expressions"),
    // Even though Babel can parse typescript, I can't have it and flow
    // enabled at the same time.
    // "@babel/plugin-syntax-typescript",
  ],
})

export default function parseCode(code: string, babelConfig: ?Object): Info {
  const { traverse, types: t } = require("@babel/core")
  const { parseSync } = require("@babel/core")
  let ast = undefined

  try {
    ast = parseSync(code, babelConfig || makeDefaultConfig())
  } catch (parseError) {
    debug("parseError", parseError)
    /* istanbul ignore next */
    return { type: "parse-error", parseError }
  }

  // console.log(JSON.stringify(ast, null, 4))

  const scopes = []
  const externalModules = []
  const exports = {}
  const paths = []

  const addModule = (moduleName, identifier, imported = "default") => {
    externalModules.push({
      local: identifier.name,
      start: identifier.start,
      end: identifier.end,
      moduleName,
      imported,
    })
  }
  const addUnboundModule = (
    moduleName,
    identifier,
    imported = identifier.name,
  ) => {
    paths.push({
      imported,
      moduleName,
      range: {
        start: identifier.start,
        end: identifier.end,
      },
    })
  }

  const isModuleDotExports = node =>
    t.isMemberExpression(node) &&
    t.isIdentifier(node.object, { name: "module" }) &&
    t.isIdentifier(node.property, { name: "exports" })

  const visitors = {
    Scope({ scope }) {
      scopes.push(scope)
    },
    CallExpression({ node, parent }) {
      // `import()` is an operator, not a function.
      // `isIdentifier` doesn't work here.
      // http://2ality.com/2017/01/import-operator.html
      const isImport = node.callee.type === "Import"

      const isRequire = t.isIdentifier(node.callee, { name: "require" })

      const isRequireResolve =
        t.isMemberExpression(node.callee, { computed: false }) &&
        t.isIdentifier(node.callee.object, { name: "require" }) &&
        t.isIdentifier(node.callee.property, { name: "resolve" })

      if (isImport || isRequire || isRequireResolve) {
        if (t.isLiteral(node.arguments[0])) {
          let moduleName
          const arg = node.arguments[0]
          if (t.isLiteral(arg)) {
            moduleName = arg.value
          }
          if (
            moduleName == null &&
            t.isTemplateLiteral(arg) &&
            arg.quasis.length === 1
          ) {
            const quasi = arg.quasis[0]
            moduleName = quasi.value.cooked
          }
          const { id } = parent

          if (moduleName != null) {
            if (
              t.isAssignmentExpression(parent) &&
              isModuleDotExports(parent.left)
            ) {
              addUnboundModule(moduleName, parent.left, "default")
            }

            paths.push({
              imported: "default",
              moduleName,
              range: {
                start: node.arguments[0].start,
                end: node.arguments[0].end,
              },
            })

            if (t.isIdentifier(id)) {
              addModule(moduleName, id)
            }
            if (t.isObjectPattern(id) || t.isArrayPattern(id)) {
              findIdentifiers(id).forEach(identifier => {
                addModule(moduleName, identifier)
              })
            }
          }
        }
      }
    },
    ImportDeclaration({ node }) {
      if (t.isLiteral(node.source)) {
        const moduleName = node.source.value
        node.specifiers.forEach(({ local, imported }) => {
          let importedName = "default"
          if (imported != null) {
            addUnboundModule(moduleName, imported)
            importedName = imported.name
          }

          addModule(moduleName, local, importedName)
        })
        paths.push({
          imported: "default",
          moduleName,
          range: {
            start: node.source.start,
            end: node.source.end,
          },
        })
      }
    },
    ExportDefaultDeclaration({ node }) {
      const { declaration } = node

      if (t.isIdentifier(declaration)) {
        exports.default = {
          start: declaration.start,
          end: declaration.end,
        }
        return
      }

      exports.default = {
        start: node.start,
        end: node.end,
      }
    },
    ExportNamedDeclaration({ node }) {
      const { specifiers, declaration } = node

      const moduleName = t.isLiteral(node.source)
        ? node.source.value
        : undefined

      specifiers.forEach(spec => {
        if (t.isExportSpecifier(spec)) {
          const { name, start, end } = spec.exported
          exports[name] = { start, end }

          // export ... from does not create a local binding, so I'm
          // gathering it in the paths. build-suggestion will convert
          // it back to a `from-module`
          if (moduleName && t.isIdentifier(spec.local)) {
            addUnboundModule(moduleName, spec.local)
            // paths.push({
            //     imported: spec.local.name,
            //     moduleName,
            //     range: {
            //         start: spec.local.start,
            //         end: spec.local.end,
            //     }
            // })
          }
        } else if (t.isExportDefaultSpecifier(spec)) {
          const { name, start, end } = spec.exported
          exports[name] = { start, end }

          if (moduleName) {
            paths.push({
              imported: "default",
              moduleName,
              range: {
                start: spec.exported.start,
                end: spec.exported.end,
              },
            })
          }
        }
      })

      if (t.isVariableDeclaration(declaration)) {
        declaration.declarations.forEach(({ id }) => {
          declaration.declarations.forEach
          findIdentifiers(id).forEach(({ name, start, end }) => {
            exports[name] = { start, end }
          })
        })
      }

      if (
        t.isFunctionDeclaration(declaration) ||
        t.isTypeAlias(declaration) ||
        t.isInterfaceDeclaration(declaration)
      ) {
        const { name, start, end } = declaration.id
        exports[name] = { start, end }
      }

      if (moduleName) {
        paths.push({
          imported: "default",
          moduleName,
          range: {
            start: node.source.start,
            end: node.source.end,
          },
        })
      }
    },
    ExportAllDeclaration({ node }) {
      if (t.isLiteral(node.source)) {
        const moduleName = node.source.value
        paths.push({
          imported: "default",
          moduleName,
          range: {
            start: node.source.start,
            end: node.source.end,
          },
        })
      }
    },
    AssignmentExpression({ node }) {
      if (isModuleDotExports(node.left)) {
        exports.default = {
          start: node.left.start,
          end: node.left.end,
        }
      }
    },
  }

  try {
    traverse(ast, visitors)
  } catch (e) {
    debug("Error traversing", e)
    /* istanbul ignore else */
    if (e[parseErrorTag]) {
      return { type: "parse-error", parseError: e }
    } else {
      /* This should never trigger, it just rethrows unexpected errors */
      throw e
    }
  }

  return {
    type: "info",
    scopes,
    // Cannot return object literal because possibly uninitialized variable [1]
    // is incompatible with string [2] in property moduleName of array element
    // of property externalModules. - $FlowFixMe
    externalModules,
    exports,
    paths,
  }
}
