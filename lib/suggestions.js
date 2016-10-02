"use babel"
/*global atom */

import url from 'url'
import shell from 'shell'
import path from 'path'
import fs from 'fs'
import { sync as resolve } from 'resolve'
import { Range } from 'atom'

function findPackageJson(basedir) {
    const packagePath = path.resolve(basedir, 'package.json')
    try {
        fs.accessSync(packagePath)
    } catch (e) {
        const parent = path.resolve(basedir, '../')
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
    const config = JSON.parse(fs.readFileSync(packagePath))

    if (config && config.moduleRoots) {
        let roots = config.moduleRoots
        if (typeof roots === 'string') {
            roots = [ roots ]
        }

        const packageDir = path.dirname(packagePath)
        return roots.map(
            r => path.resolve(packageDir , r)
        )
    }
}

function resolveWithCustomRoots(basedir, absoluteModule) {
    const module = `./${absoluteModule}`

    const roots = loadModuleRoots(basedir)

    if (roots) {
        // Atom doesn't support custom roots, but I need something I can use
        // to verify the feature works.
        if (false) { require('make-cache') } // eslint-disable-line

        const options = {
            basedir,
            extensions: atom.config.get('js-hyperclick.extensions'),
        }
        for (let i = 0; i < roots.length; i++) {
            options.basedir = roots[i]

            try {
                return resolve(module, options)
            } catch (e) {
                /* do nothing */
            }
        }
    }
}

function resolveModule(textEditor, module) {
    const basedir = path.dirname(textEditor.getPath())
    const options = {
        basedir,
        extensions: atom.config.get('js-hyperclick.extensions')
    }

    try {
        const filename = resolve(module, options)
        if (filename == module) {
            return `http://nodejs.org/api/${module}.html`
        }
        return filename
    } catch (e) {
        /* do nothing */
    }

    // Allow linking to relative files that don't exist yet.
    if (module[0] === '.') {
        if (path.extname(module) == '') {
            module += '.js'
        }

        return path.join(basedir, module)
    } else {
        return resolveWithCustomRoots(basedir, module)
    }
}

const scopeSize = ({block: b}) => b.end - b.start

export const isJavascript = (textEditor) => {
    const { scopeName } = textEditor.getGrammar()

    return (scopeName === 'source.js' || scopeName === 'source.js.jsx')
}

function findClosestScope(scopes, start, end) {
    return scopes.reduce((closest, scope) => {
        const { block } = scope

        if (block.start <= start
            && block.end >= end
            && scopeSize(scope) < scopeSize(closest)
        ) {
            return scope
        }

        return closest
    })
}

function moduleResult({module, imported}, textEditor, range, cache) {
    return {
        range,
        callback() {
            // ctrl+click creates multiple cursors. This will remove all but the
            // last one to simulate cursor movement instead of creation.
            const lastCursor = textEditor.getLastCursor()
            textEditor.setCursorBufferPosition(lastCursor.getBufferPosition())

            const filename = resolveModule(textEditor, module)

            if (filename == null) {
                const detail = `module ${module} was not found`

                atom.notifications.addWarning("js-hyperclick", { detail })
                return
            }

            const { protocol } = url.parse(filename)
            if (protocol === 'http:' || protocol === 'https:') {
                if (atom.packages.isPackageLoaded('web-browser')) {
                    atom.workspace.open(filename)
                } else {
                    shell.openExternal(filename)
                }
                return
            }

            const options = {
                pending: atom.config.get('js-hyperclick.usePendingPanes')
            }

            atom.workspace.open(filename, options).then((editor) => {
                const { parseError, exports } = cache.get(editor)
                if (parseError) return

                let target = exports[imported]
                if (target == null) {
                    target = exports.default
                }

                if (target != null) {
                    const position = editor.getBuffer().positionForCharacterIndex(target.start)
                    editor.setCursorBufferPosition(position)
                }

            })

        }
    }
}

function pathResult(path, textEditor, cache) {
    const module = {
        module: path.module,
        imported: 'default',
    }

    const range = new Range(
        textEditor.getBuffer().positionForCharacterIndex(path.start).toArray(),
        textEditor.getBuffer().positionForCharacterIndex(path.end).toArray()
    )

    return moduleResult(module, textEditor, range, cache)
}

export default function(textEditor, text, range, cache) {
    if (text.length === 0) {
        return null
    }
    const { parseError, paths, scopes, externalModules } = cache.get(textEditor)
    if (parseError) {
        return {
            range,
            callback() {
                const [ projectPath, relativePath ] = atom.project.relativizePath(textEditor.getPath())
                void(projectPath)

                atom.notifications.addError(`js-hyperclick: error parsing ${relativePath}`, {
                    detail: parseError.message
                })
            }
        }
    }

    const start = textEditor.buffer.characterIndexForPosition(range.start)
    const end = textEditor.buffer.characterIndexForPosition(range.end)

    for (let i = 0; i < paths.length; i++) {
        const path = paths[i]
        if (path.start > end) { break }
        if (path.start < start && path.end > end) {
            return pathResult(path, textEditor, cache)
        }
    }

    const closestScope = findClosestScope(scopes, start, end)

    // Sometimes it reports it has a binding, but it can't actually get the
    // binding
    if (closestScope.hasBinding(text) && closestScope.getBinding(text)) {

        const binding = closestScope.getBinding(text)
        const { line, column } =  binding.identifier.loc.start

        const clickedDeclaration = (line - 1 == range.start.row && column == range.start.column)
        const crossFiles = !atom.config.get('js-hyperclick.jumpToImport')

        if (clickedDeclaration || crossFiles) {
            const module = externalModules.find((m) => {
                const { start: bindingStart } = binding.identifier
                return m.local == text && m.start == bindingStart
            })

            if (module) {
                return moduleResult(module, textEditor, range, cache)
            }
        }

        // Exit early if you clicked on where the variable is declared
        if (clickedDeclaration) {
            return null
        }

        return {
            range,
            callback() {
                textEditor.setCursorBufferPosition([line - 1, column])
                textEditor.scrollToCursorPosition()
            }
        }
    }
}
