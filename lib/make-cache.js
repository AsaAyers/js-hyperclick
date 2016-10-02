"use babel"

// TimeCop was reporting that it took over 600ms for js-hyperclick to start.
// Converting this `import` to a `require` reduced it to under 250ms Moving it
// to require inside `findIdentifiers` and `parseCode` moved it off the TimeCop
// list (under 5ms)

/*
import { parse, traverse, types as t } from 'babel-core'
*/


function findIdentifiers(node, identifiers = []) {
    const { types: t } = require('babel-core')
    const reducer = (tmp, {value}) => {
        let newIdentifiers = []
        if (t.isIdentifier(value)) {
            newIdentifiers = [value]
        } else if (t.isObjectPattern(value) || t.isArrayPattern(value)) {
            newIdentifiers = findIdentifiers(value)
        } else {
            throw new Error("Unknown node type")
        }

        return [...tmp, ...newIdentifiers]
    }

    if (t.isObjectPattern(node)) {
        return node.properties.reduce(reducer, identifiers)
    } else if (t.isArrayPattern(node)) {
        return node.elements.reduce(reducer, identifiers)
    } else if (t.isIdentifier(node)) {
        return [ node ]
    } else {
        throw new Error('Unknown node type')
    }
}

export function parseCode(code) {
    const { traverse, types: t } = require('babel-core')
    const { parse } = require('babylon')
    let ast = undefined

    try {
        ast = parse(code, {
            sourceType: "module",
            plugins: [
                'jsx',
                'flow',
                'doExpressions',
                'objectRestSpread',
                'decorators',
                'classProperties',
                'exportExtensions',
                'asyncGenerators',
                'functionBind',
                'functionSent',
            ]
        })
    } catch (parseError) {
        return { parseError }
    }

    const scopes = []
    const externalModules = []
    const exports = {}
    const paths = []

    const addModule = (module, identifier, imported = 'default') => {
        externalModules.push({
            local: identifier.name,
            start: identifier.start,
            end: identifier.end,
            module,
            imported,
        })
    }

    traverse(ast, {
        Scope({ scope }) {
            scopes.push(scope)
        },
        CallExpression({ node, parent }) {
            if (t.isIdentifier(node.callee, { name: "require" })) {
                if (t.isLiteral(node.arguments[0])) {
                    const module = node.arguments[0].value
                    const { id } = parent

                    paths.push({
                        start: node.arguments[0].start,
                        end: node.arguments[0].end,
                        module,
                    })

                    if (t.isIdentifier(id)) {
                        addModule(module, id)
                    }
                    if (t.isObjectPattern(id) || t.isArrayPattern(id)) {
                        findIdentifiers(id).forEach((identifier) => {
                            addModule(module, identifier)
                        })
                    }
                }
            }
        },
        ImportDeclaration({ node }) {
            if (t.isLiteral(node.source)) {
                const module = node.source.value
                paths.push({
                    start: node.source.start,
                    end: node.source.end,
                    module,
                })
                node.specifiers.forEach(({local, imported}) => {
                    let importedName = 'default'
                    if (imported != null) {
                        importedName = imported.name
                    }

                    addModule(module, local, importedName)
                })
            }
        },
        ExportDefaultDeclaration({ node }) {
            exports.default = {
                start: node.start,
                end: node.end,
            }
        },
        ExportNamedDeclaration({ node }) {
            const { specifiers, declaration } = node

            specifiers.forEach((spec) => {
                if (t.isExportSpecifier(spec)) {
                    const { name, start, end } = spec.exported
                    exports[name] = { start, end }
                }
            })

            if (t.isVariableDeclaration(declaration)) {
                declaration.declarations.forEach(({id}) => {
                    declaration.declarations.forEach
                    findIdentifiers(id).forEach(({name, start, end}) => {
                        exports[name] = { start, end }
                    })
                })
            }

            if (t.isFunctionDeclaration(declaration)) {
                const { name, start, end } = declaration.id
                exports[name] = { start, end }
            }

            if (t.isLiteral(node.source)) {
                const module = node.source.value
                paths.push({
                    start: node.source.start,
                    end: node.source.end,
                    module,
                })
            }

        },
        ExportAllDeclaration({ node }) {
            if (t.isLiteral(node.source)) {
                const module = node.source.value
                paths.push({
                    start: node.source.start,
                    end: node.source.end,
                    module,
                })
            }
        },
        AssignmentExpression({ node: {left, start, end} }) {
            if (t.isMemberExpression(left)
                && t.isIdentifier(left.object), { name: 'module'}
                && t.isIdentifier(left.property, { name: 'exports'})
            ) {
                exports.default = { start, end }
            }
        }
    })

    return {
        scopes,
        externalModules,
        exports,
        paths,
    }
}

export default function makeCache(subscriptions) {
    const editors = new WeakMap()
    const data = new WeakMap()

    function watchEditor(editor) {
        if (!editors.has(editor)) {
            editors.set(editor, null)
            subscriptions.add(editor.onDidStopChanging(() => {
                data.delete(editor)
            }))
        }
    }


    return {
        get(editor) {
            watchEditor(editor)
            if (!data.has(editor)) {
                data.set(editor, parseCode(editor.getText()))
            }

            return data.get(editor)
        }
    }
}
