/* eslint-disable */

import someModule /* someModule */, {
    namedExportFrom, /* namedExportFrom */
    missingExport, /* missingExport */
    name1, /* name1 */
    name2, /* name2 */
    name3, /* name3 */
    name4, /* name4 */
} from './es6-module'

// I had to add this here because es6-module can't have multiple default exports
export default function() {}
