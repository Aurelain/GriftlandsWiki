const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * These art ids appear in both battle and negotiation, but are useless in one of them.
 * The ones mentioned here will be ignored.
 */
const COLLISION_ART = {
    backfire: true,
    barrage: false,
    erupt: false,
    reversal: true,
    size_up: true,
    spin: false,
    switch_blade: true,
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *      a_hot_tip: false, // negotiation
 *      absolute_domination: true, // battle
 *      ...
 * }
 */
const getArtIds = (assetsZip) => {
    const entries = assetsZip.getEntries();
    const bag = {};
    for (const entry of entries) {
        const {entryName} = entry;
        const isBattle = entryName.startsWith('battle/');
        if (isBattle || entryName.startsWith('negotiation/')) {
            const parts = entryName.split('/');
            if (parts.length === 2) {
                const id = parts[1].split('.')[0];
                if (id === 'battle' || id === 'negotiation') {
                    // This is the sprite-sheet.
                    continue;
                }
                if (id in COLLISION_ART && COLLISION_ART[id] === isBattle) {
                    // Useless art
                    continue;
                }
                assert(bag[id] === undefined, `"${id}" already appears in the art list!`);
                bag[id] = isBattle;
            }
        }
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
