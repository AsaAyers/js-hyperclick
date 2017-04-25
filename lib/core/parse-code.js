"use babel"

// TimeCop was reporting that it took over 600ms for js-hyperclick to start.
// Converting this `import` to a `require` reduced it to under 250ms Moving it
// to require inside `findIdentifiers` and `parseCode` moved it off the TimeCop
// list (under 5ms)

/*
import { parse, traverse, types as t } from 'babel-core'
*/

const parseErrorTag = Symbol()

const identifierReducer = (tmp, node) => {
    let value = node
    if (node.value) {
        value = node.value
    }
    const { types: t } = require('babel-core')
    let newIdentifiers
    if (t.isIdentifier(value)) {
        newIdentifiers = [value]
    } else if (t.isObjectPattern(value) ) {
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
    const { types: t } = require('babel-core')

    if (t.isObjectPattern(node)) {
        return node.properties.reduce(identifierReducer, identifiers)
    } else if (t.isArrayPattern(node)) {
        return node.elements.reduce(identifierReducer, identifiers)
    } else if (t.isIdentifier(node)) {
        return [ node ]
    }
    /* istanbul ignore next */
    throw new Error('Unknown node type')
}

export default function parseCode(code) {
    const { traverse, types: t } = require('babel-core')
    const { Hub, NodePath } = traverse
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
    }  catch (parseError) {
        /* istanbul ignore next */
        return { parseError }
    }

    // console.log(JSON.stringify(ast, null, 4))

    const scopes = []
    const externalModules = []
    const exports = {}
    const paths = []

    const addModule = (moduleName, identifier, imported = 'default') => {
        externalModules.push({
            local: identifier.name,
            start: identifier.start,
            end: identifier.end,
            moduleName,
            imported,
        })
    }
    const addUnboundModule = (moduleName, identifier, imported = identifier.name) => {
        paths.push({
            imported,
            moduleName,
            range: {
                start: identifier.start,
                end: identifier.end,
            }
        })
    }

    const isModuleDotExports = (node)  => (
        t.isMemberExpression(node)
        && t.isIdentifier(node.object, { name: 'module'})
        && t.isIdentifier(node.property, { name: 'exports'})
    )


    const visitors = {
        Scope({ scope }) {
            scopes.push(scope)
        },
        CallExpression({ node, parent }) {
            if (t.isIdentifier(node.callee, { name: "require" })) {
                if (t.isLiteral(node.arguments[0])) {
                    const moduleName = node.arguments[0].value
                    const { id } = parent

                    if (t.isAssignmentExpression(parent) && isModuleDotExports(parent.left)) {
                        addUnboundModule(moduleName, parent.left, 'default')
                    }

                    paths.push({
                        imported: 'default',
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
                        findIdentifiers(id).forEach((identifier) => {
                            addModule(moduleName, identifier)
                        })
                    }
                }
            }
        },
        ImportDeclaration({ node }) {
            if (t.isLiteral(node.source)) {
                const moduleName = node.source.value
                node.specifiers.forEach(({local, imported}) => {
                    let importedName = 'default'
                    if (imported != null) {
                        addUnboundModule(moduleName, imported)
                        importedName = imported.name
                    }

                    addModule(moduleName, local, importedName)
                })
                paths.push({
                    imported: 'default',
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

            const moduleName = (t.isLiteral(node.source)
                ? node.source.value
                : undefined
            )

            specifiers.forEach((spec) => {
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
                            imported: 'default',
                            moduleName,
                            range: {
                                start: spec.exported.start,
                                end: spec.exported.end,
                            }
                        })

                    }

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

            if (moduleName) {
                paths.push({
                    imported: 'default',
                    moduleName,
                    range: {
                        start: node.source.start,
                        end: node.source.end,
                    }
                })
            }
        },
        ExportAllDeclaration({ node }) {
            if (t.isLiteral(node.source)) {
                const moduleName = node.source.value
                paths.push({
                    imported: 'default',
                    moduleName,
                    range: {
                        start: node.source.start,
                        end: node.source.end,
                    }
                })
            }
        },
        AssignmentExpression({ node }) {
            if (isModuleDotExports(node.left)) {
                exports.default = {
                    start: node.left.start,
                    end: node.left.end
                }
            }
        }
    }


    try {
        const hub = new Hub({
            buildCodeFrameError(node, message, Error) {
                const loc = node && (node.loc || node._loc)

                /* istanbul ignore else */
                if (loc) {
                    const err =  new Error(`${message} (${loc.start.line}:${loc.start.column})`)
                    err[parseErrorTag] = true
                    return err
                } else {
                    // Assume if we don't have a location, then it isn't a problem
                    // in the user's code and shouldn't be displayed as a parse
                    // error.
                    return new Error(message)
                }
            }
        })
        const path = NodePath.get({
            hub: hub,
            parentPath: null,
            parent: ast,
            container: ast,
            key: "program"
        }).setContext()
        // On order to capture duplicate declaration errors I have to build a
        // scope to get access to a "hub" that returns the error I need to catch.
        //
        // https://github.com/babel/babel/issues/4640
        traverse(ast, visitors, path.scope)
    } catch (e) {
        /* istanbul ignore else */
        if (e[parseErrorTag]) {
            return { parseError: e }
        } else {
            /* This should never trigger, it just rethrows unexpected errors */
            throw e
        }
    }

    return {
        scopes,
        externalModules,
        exports,
        paths,
    }
}
