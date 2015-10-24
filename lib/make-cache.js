"use babel"

import { parse, traverse, types as t } from 'babel-core'

window.t = t

function findIdentifiers(node, identifiers = []) {
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
    }
}

export function parseCode(code) {
    const ast = {
        type: 'File',
        start: 0,
        end: code.length,
        program: parse(code),
    }

    const scopes = []
    const externalModules = []

    const addModule = (module, identifier) => {
        externalModules.push({
            name: identifier.name,
            start: identifier.start,
            end: identifier.end,
            module,
        })
    }

    traverse(ast, {
        Scope(node, parent, scope) {
            scopes.push(scope)
        },
        CallExpression(node, parent) {
            if (t.isIdentifier(node.callee, { name: "require" })) {
                if (t.isLiteral(node.arguments[0])) {
                    const module = node.arguments[0].value
                    const { id } = parent

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
        ImportDeclaration(node, parent) {
            if (t.isLiteral(node.source)) {
                const module = node.source.value
                node.specifiers.forEach(({local}) => {
                    addModule(module, local)
                })
            }
        }
    })

    return {
        scopes,
        externalModules,
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
