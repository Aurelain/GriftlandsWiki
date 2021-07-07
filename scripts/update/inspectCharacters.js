const fs = require('fs');

const tally = require('../utils/tally');
const getFilePath = require('../utils/getFilePath');
const {STORAGE} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * In this case:
 * - `cloud` means `gameDir`
 * - `local` means `wiki`
 * {
 *     synchronized: {...},
 *     different: {...},
 *     cloudOnly: {...},
 *     localOnly: {...},
 * }
 */
const inspectCharacters = (prepared) => {
    console.log('Inspecting characters...');
    const synchronized = {};
    const different = {};
    const cloudOnly = {};
    const localOnly = {};
    for (const filePath in prepared) {
        const {title, content} = prepared[filePath];
        const fullPath = STORAGE + '/' + filePath;
        if (fs.existsSync(fullPath)) {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            if (fileContent === content) {
                synchronized[filePath] = {
                    title,
                    content: '',
                };
            } else {
                different[filePath] = {
                    title,
                    content: '',
                };
            }
        } else {
            cloudOnly[filePath] = {
                title,
                content: '',
            };
        }
    }
    const statusTally = {
        synchronized: tally(synchronized),
        different: tally(different),
        cloudOnly: tally(cloudOnly),
        localOnly: tally(localOnly),
    };
    console.log('Status tally:', JSON.stringify(statusTally, null, 4));
    return {synchronized, different, cloudOnly, localOnly};
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = inspectCharacters;
