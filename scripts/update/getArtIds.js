const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * These art ids appear in both battle and negotiation, but are useless in one of them.
 * The ones mentioned here will be ignored.
 */
const COLLISION_ART = {
    backfire: 'battle', // Rook
    barrage: 'negotiation', // Smith
    erupt: 'negotiation', // Sal
    reversal: 'battle', // Sal
    size_up: 'battle', // Sal
    spin: 'negotiation', // Rook
    switch_blade: 'battle', // Sal
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
                if (id in COLLISION_ART) {
                    const deckType = COLLISION_ART[id];
                    if ((deckType === 'battle' && !isBattle) || (deckType === 'negotiation' && isBattle)) {
                        // Useless art
                        continue;
                    }
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
