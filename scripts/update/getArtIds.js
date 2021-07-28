const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *      'negotiation/a_hot_tip': true,
 *      'battle/absolute_domination': true,
 *      ...
 * }
 */
const getArtIds = (assetsZip) => {
    const entries = assetsZip.getEntries();
    const bag = {};
    for (const entry of entries) {
        const {entryName} = entry;
        const folderName = entryName.split('/')[0];
        if (folderName !== 'battle' && folderName !== 'negotiation') {
            continue; // This is not a card icon.
        }
        const parts = entryName.split('/');
        if (parts.length !== 2) {
            continue; // This is a modifier or a condition.
        }
        const id = parts[1].split('.')[0].toLowerCase();
        if (id === folderName) {
            continue; // This is the sprite-sheet.
        }
        bag[folderName + '/' + id] = true;
    }
    return bag;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getArtIds;
