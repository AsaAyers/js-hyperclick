/* eslint-disable */

var testVar /* testVar */
let testLet /* testLet */
const testConst /* testConst */ = null

console.log({
    testVar, /* log_testVar */
    testLet, /* log_testLet */
    testConst, /* log_testConst */
})

function functionDeclaration /* functionDeclaration */ (param1 /* param1 */) {
    console.log({
        param1, /* log_param1 */
        functionDeclaration, /* log_functionDeclaration */
    })
}
console.log({
    functionDeclaration, /* log2_functionDeclaration */
})

function testDestructuring({ dstrP1 /* dstrP1 */, dBar: [ dstrP2 /* dstrP2 */ ]}) {
    const { dstrC1 /* dstrC1 */, arr: [ dstrC2 /* dstrC2 */ ]} = {}

    console.log({
        dstrP1, /* log_dstrP1 */
        dstrP2, /* log_dstrP2 */
        dstrC1, /* log_dstrC1 */
        dstrC2, /* log_dstrC2 */
    })
}

import otherDefault /* otherDefault */, { otherNamed /* otherNamed */ } from './other'
import { otherNamed2 /* otherNamed2 */ as renamed /* renamed */ } from './other'

console.log({
    otherDefault, /* log_otherDefault */
    otherNamed, /* log_otherNamed */
    renamed, /* log_renamed */
});

export { testConst /* export_testConst */ }
export default functionDeclaration /* defaultExport */
export { namedExportFrom /* namedExportFrom */ } from './exportFrom'
export defaultExportFrom /* defaultExportFrom */ from './exportFrom'
export * from './exportStar.js' /* exportStar */

if /* if */ (true) { }

export const exportConst /* exportConst */ = null
export function exportFunction /* exportFunction */() {}
export const { name1 /* name1 */, x: { name2 /* name2 */ } } = {}
export const [ name3 /* name3 */, [ name4 /* name4 */ ] ] = {}
