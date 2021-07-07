const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const SOURCE_FILE = 'scripts/content/factions/factions.lua';
const WIKI_FACTIONS = {
    ADMIRALTY: 'admiralty',
    BANDITS: 'spree',
    BILEBROKERS: 'bilebroker',
    BOGGERS: 'boggers',
    CULT_OF_HESH: 'cult of hesh',
    DELTREAN: 'deltreans',
    FEUD_CITIZEN: 'civilian',
    GRIFTER: 'grifters',
    JAKES: 'jakes',
    RENTORIAN: 'rentorians',
    RISE: 'rise',
    SPARK_BARONS: 'spark barons',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *     'RENTORIAN': 'rentorians',
 *     ...
 * }
 */
const getFactions = (zip) => {
    const lua = zip.getEntry(SOURCE_FILE).getData().toString('utf8');
    const bag = {};
    lua.replace(/id = "(.*?)"[\s\S]*?name = "(.*?)"/g, (matched, capturedId) => {
        // Note: we're not using the game name. Instead, we're using the wiki name.
        assert(WIKI_FACTIONS[capturedId], 'Unknown faction!');
        bag[capturedId] = WIKI_FACTIONS[capturedId];
    });
    return bag;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getFactions;
