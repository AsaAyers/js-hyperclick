"use babel"
// @flow
import path from "path"
import fs from "fs"
import { sync as resolve } from "resolve"
import type { Resolved } from "../types"

// Default comes from Node's `require.extensions`
const defaultExtensions = [".js", ".json", ".node"]
type ResolveOptions = {
  extensions?: typeof defaultExtensions,
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
  const rootPath = atom.config.get("js-hyperclick.rootPath")
  let roots = config.moduleRoots || rootPath
  
  if (roots) {
    if (typeof roots === "string") {
      roots = [roots]
    }

    const packageDir = path.dirname(packagePath)
    return roots.map(r => path.resolve(packageDir, r))
  }
}

function resolveWithCustomRoots(basedir, absoluteModule, options) {
  const { extensions = defaultExtensions } = options
  const moduleName = `./${absoluteModule}`

  const roots = loadModuleRoots(basedir)

  if (roots) {
    const resolveOptions = { basedir, extensions }
    for (let i = 0; i < roots.length; i++) {
      resolveOptions.basedir = roots[i]

      try {
        return resolve(moduleName, resolveOptions)
      } catch (e) {
        /* do nothing */
      }
    }
  }
}

export default function resolveModule(
  filePath: string,
  suggestion: { moduleName: string },
  options: ResolveOptions = {},
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
  } else if (!filename) {
    filename = resolveWithCustomRoots(basedir, moduleName, options)
  }

  return { type: "file", filename }
}
