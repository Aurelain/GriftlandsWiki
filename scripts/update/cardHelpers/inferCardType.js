const assert = require('assert');
const objectify = require('../../utils/objectify');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const FLAG_TO_TYPE = {
    // Battle:
    skill: 'Maneuver',
    ranged: 'Attack',
    melee: 'Attack',
    // Negotiation:
    manipulate: 'Manipulate',
    hostile: 'Hostility',
    diplomacy: 'Diplomacy',
    // Other:
    status: 'Status',
    score: 'Score',
    item: 'Item',
    parasite: 'Parasite',
};

const RANKS = objectify([
    'score',
    'parasite',
    'item',
    'status',
    'skill',
    'ranged',
    'melee',
    'manipulate',
    'hostile',
    'diplomacy',
]);

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const inferCardType = (card) => {
    const {flags, id, name} = card;
    assert(flags, `${id} is missing its flags!`);
    const bag = {};
    for (const flag of flags) {
        if (flag in FLAG_TO_TYPE) {
            bag[flag] = true;
        }
    }
    const interestingFlags = Object.keys(bag);
    interestingFlags.sort(sorter);
    // assert(interestingFlags.length === 1, `${id} has an unexpected type! ${interestingFlags}`);
    return FLAG_TO_TYPE[interestingFlags[0]];
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const sorter = (a, b) => {
    if (RANKS[a] < RANKS[b]) {
        return -1;
    } else {
        return 1;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = inferCardType;
