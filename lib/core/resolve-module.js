"use babel"
// @flow
import path from "path"
import fs from "fs"
import { sync as resolve } from "resolve"
import type { Resolved } from "../types"
import makeDebug from "debug"
const debug = makeDebug("js-hyperclick:resolve-module")

// Default comes from Node's `require.extensions`
const defaultExtensions = [".js", ".json", ".node"]
type ResolveOptions = {
  extensions?: typeof defaultExtensions,
  requireIfTrusted: (moduleName: string) => any,
}

function findPackageJson(basedir) {
  const packagePath = path.resolve(basedir, "package.json")
  try {
    fs.accessSync(packagePath)
  } catch (e) {
    const parent = path.resolve(basedir, "../")
    if (parent != basedir) {
      return findPackageJson(parent)
    }
    return undefined
  }
  return packagePath
}

function loadModuleRoots(basedir) {
  const packagePath = findPackageJson(basedir)
  if (!packagePath) {
    return
  }
  const config = JSON.parse(String(fs.readFileSync(packagePath)))

  if (config && config.moduleRoots) {
    let roots = config.moduleRoots
    if (typeof roots === "string") {
      roots = [roots]
    }

    const packageDir = path.dirname(packagePath)
    return roots.map(r => path.resolve(packageDir, r))
  }
}

function resolveWithCustomRoots(basedir, absoluteModule, options): Resolved {
  const { extensions = defaultExtensions, requireIfTrusted } = options
  const moduleName = `./${absoluteModule}`

  const roots = loadModuleRoots(basedir)

  if (roots) {
    const resolveOptions = { basedir, extensions }
    for (let i = 0; i < roots.length; i++) {
      let stats
      try {
        stats = fs.statSync(roots[i])
      } catch (e) {
        // Ignore invalid moduleRoots instead of throwing an error.
        continue
      }

      if (stats.isFile()) {
        const resolver = roots[i]
        try {
          // $FlowExpectError
          const customResolver = requireIfTrusted(resolver)
          const filename = customResolver({
            basedir,
            moduleName: absoluteModule,
          })
          debug("filename", filename)
          // it's ok for a custom resolver to jut pass on a module
          if (filename == null) {
            continue
          } else if (typeof filename === "string") {
            if (filename.match(/^http/)) {
              return { type: "url", url: filename }
            }

            resolveOptions.basedir = basedir
            return {
              type: "file",
              filename: resolve(filename, resolveOptions),
            }
          }
          throw new Error(
            `Custom resolvers must return a string or null/undefined.\nRecieved: ${filename}`,
          )
        } catch (e) {
          e.message = `Error in custom resolver: ${resolver}\n\n${e.message}`
          throw e
        }
      }
      resolveOptions.basedir = roots[i]

      try {
        const filename = resolve(moduleName, resolveOptions)
        return { type: "file", filename }
      } catch (e) {
        /* do nothing */
      }
    }
  }
  return { type: "file", filename: undefined }
}

export default function resolveModule(
  filePath: string,
  suggestion: { moduleName: string },
  options: ResolveOptions,
): Resolved {
  const { extensions = defaultExtensions } = options
  let { moduleName } = suggestion

  const basedir = path.dirname(filePath)
  const resolveOptions = { basedir, extensions }

  let filename

  try {
    filename = resolve(moduleName, resolveOptions)
    if (filename == moduleName) {
      return {
        type: "url",
        url: `http://nodejs.org/api/${moduleName}.html`,
      }
    }
  } catch (e) {
    if (moduleName === "atom") {
      return {
        type: "url",
        url: `https://atom.io/docs/api/latest/`,
      }
    }
  }

  // Allow linking to relative files that don't exist yet.
  if (!filename && moduleName[0] === ".") {
    if (path.extname(moduleName) == "") {
      moduleName += ".js"
    }

    filename = path.join(basedir, moduleName)
    debug("opening new file", filename)
  } else if (!filename) {
    const customResolution = resolveWithCustomRoots(
      basedir,
      moduleName,
      options,
    )
    debug("Custom Resolution", customResolution)
    return customResolution
  } else {
    debug("resolved", filename)
  }

  return { type: "file", filename }
}
