// All of these imports depend on the moduleRoots entry in package.json

// This resolves using the "lib/core"
import "parse-code"

// Everything below resolves using the `custom-resolver.js`

// https://github.com/AsaAyers/js-hyperclick/issues/46
import "/lib/js-hyperclick"
// https://github.com/AsaAyers/js-hyperclick/issues/58
import "@/js-hyperclick"

import "this-directory/es6-module"
import "url-example"
