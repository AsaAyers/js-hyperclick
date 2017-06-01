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

  if (config && config.moduleRoots) {
    let roots = config.moduleRoots
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

function loadModuleAliases(basedir) {
  const packagePath = findPackageJson(basedir)
  if (!packagePath) {
    return
  }
  const config = JSON.parse(String(fs.readFileSync(packagePath)))

  if (config && config.moduleAliases) {
    return config.moduleAliases
  }
}

function applyAliases (absoluteModule, aliases) {
  const keys = Object.keys(aliases)
  let i = keys.length

  while (i--) {
    const key = keys[i]
    if (absoluteModule.indexOf(key) === 0) {
      const regExp = new RegExp(`^${key}`)

      return absoluteModule.replace(regExp, aliases[key])
    }
  }

  return absoluteModule
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
  const alises = loadModuleAliases(basedir)

  if (alises) {
    moduleName = applyAliases(moduleName, alises)
  }

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
    /* do nothing */
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
