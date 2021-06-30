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
const inspectCharacters = ({people, bosses}) => {
    console.log('Inspecting characters...');
    const all = [...people, ...bosses];
    const synchronized = {};
    const different = {};
    const cloudOnly = {};
    const localOnly = {};
    for (const character of all) {
        const {name} = character;
        const filePath = getFilePath(name, '');
        if (fs.existsSync(STORAGE + '/' + filePath)) {
            synchronized[filePath] = {
                title: name,
                content: '',
            };
            // console.log('synchronized:', name);
        } else {
            cloudOnly[filePath] = {
                title: name,
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
