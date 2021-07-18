const assert = require('assert');
const tally = require('../utils/tally');
const findEnclosure = require('../utils/findEnclosure');
const removeUndefined = require('../utils/removeUndefined');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const RARITIES = {
    'CARD_RARITY.BASIC': 'Basic',
    'CARD_RARITY.COMMON': 'Common',
    'CARD_RARITY.UNCOMMON': 'Uncommon',
    'CARD_RARITY.RARE': 'Rare',
    'CARD_RARITY.UNIQUE': 'Unique',
    'CARD_RARITY.BOSS': 'Boss',
};

/**
 *  data_scripts/scripts/battle/battle_defs.lua
 *  or
 *  data_scripts/scripts/negotiation/negotiation_defs.lua
 */
const KEYWORDS = {
    'CARD_FLAGS.UNPLAYABLE': 'Unplayable',
    'CARD_FLAGS.EXPEND': 'Expend',
    'CARD_FLAGS.MULTISHOT': 'Multishot',
    'CARD_FLAGS.AMBUSH': 'Ambush',
    'CARD_FLAGS.CONSUME': 'Destroy',
    'CARD_FLAGS.PIERCING': 'Piercing',
    'CARD_FLAGS.PARASITE': 'Parasite',
    'CARD_FLAGS.FLOURISH': 'Flourish',
    'CARD_FLAGS.STICKY': 'Sticky',
    'CARD_FLAGS.TOOLBOX': 'Toolbox',
    'CARD_FLAGS.BURNOUT': 'Burnout',
    'CARD_FLAGS.RESTRAINED': 'Restrained',
    'CARD_FLAGS.SCORE': 'Score',
    'CARD_FLAGS.GALVANIZED': 'Galvanized',
    'CARD_FLAGS.SLIMY': 'Slimy',
    'CARD_FLAGS.SLEEP_IT_OFF': 'Sleep It Off',
    'CARD_FLAGS.COMBO_FINISHER': 'Finisher',
    'CARD_FLAGS.DUD': 'Dud',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *
 * }
 */
const getCards = (zip) => {
    const entries = zip.getEntries();
    const output = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            const cards = collectCardsFromLua(lua, entryName);
            Object.assign(output, cards);
        }
    }
    fillUpgrades(output);
    console.log('getCards', tally(output));
    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const collectCardsFromLua = (luaContent, luaName) => {
    let draft = luaContent.replace(/--.*/g, ''); // remove comments
    const isNegotiation = draft.includes('AddNegotiationCard');
    const isBattle = draft.includes('AddBattleCard');
    if (!isNegotiation && !isBattle) {
        // return;
    }
    const nameRegExp = /\w+\s*=\s*{\s*name\s*=\s*"/g;
    let myResult;
    const output = {};
    while ((myResult = nameRegExp.exec(draft)) !== null) {
        const index = nameRegExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(draft, index, '{', '}');
        if (!enclosure) {
            // TODO: investigate why this happens
            continue;
        }
        const id = enclosure.match(/\w+/)[0];
        const rarity = (enclosure.match(/\s*rarity\s*=\s*(\w+\.\w+)/) || [])[1];
        const isUpgrade = id.includes('_plus');
        const isCard = rarity || isUpgrade;
        if (!isCard) {
            continue;
        }
        const name = captureText(enclosure, 'name');

        const flags = (enclosure.match(/\s*flags\s*=\s*([^,\r\n]+)/) || [])[1];
        output[id] = removeUndefined({
            name,
            id,
            desc: captureText(enclosure, 'desc'),
            character: undefined, // TODO
            deckType: parseDeckType(flags),
            cardType: parseCardType(flags),
            keywords: parseKeywords(flags),
            flavour: cleanFlavour(captureText(enclosure, 'flavour')),
            rarity: RARITIES[rarity],
            parent: undefined,
            upgrades: undefined,
            cost: captureNumber(enclosure, 'cost'),
            xp: captureNumber(enclosure, 'max_xp'),
            minDamage: captureNumber(enclosure, 'min_damage'),
            maxDamage: captureNumber(enclosure, 'min_damage'),
        });
    }
    return output;
};

/**
 *
 */
const captureNumber = (text, prop) => {
    const re = new RegExp('\\s*' + prop + '\\s*=\\s*(\\d+)');
    const found = text.match(re);
    if (found) {
        return Number(found[1]);
    }
};

/**
 *
 */
const captureText = (text, prop) => {
    const re = new RegExp('\\s*' + prop + '\\s*=\\s*"([\\s\\S]+?)"');
    const found = text.match(re) || [];
    return found[1];
};

/**
 *
 */
const cleanFlavour = (flavour) => {
    if (!flavour) {
        return;
    }
    flavour = flavour.replace(/^['’\s]+/m, '');
    flavour = flavour.replace(/['’\s]+$/m, '');
    return flavour;
};

/**
 *
 */
const parseDeckType = (flags) => {
    if (!flags) {
        return;
    }
    return undefined; // TODO
};

/**
 *
 */
const parseCardType = (flags) => {
    if (!flags) {
        return;
    }
    return undefined; // TODO
};

/**
 *
 */
const parseKeywords = (flags) => {
    if (!flags) {
        return;
    }
    const keywords = [];
    for (const keyword in KEYWORDS) {
        if (flags.includes(keyword)) {
            keywords.push(KEYWORDS[keyword]);
        }
    }
    return keywords.length ? keywords.sort().join(',') : undefined;
};

/**
 *
 */
const fillUpgrades = (bag) => {
    for (const id in bag) {
        const plusIndex = id.indexOf('_plus');
        if (plusIndex > 0) {
            const base = id.substr(0, plusIndex);
            assert(bag[base], 'Base card is missing!');
            bag[id] = {
                ...bag[base],
                ...bag[id],
                parent: bag[base].name,
            };
            delete bag[id].upgrades;
            if (!bag[base].upgrades) {
                bag[base].upgrades = [];
            }
            bag[base].upgrades.push(bag[id].name);
        }
    }
    for (const id in bag) {
        const {upgrades} = bag[id];
        if (upgrades) {
            bag[id].upgrades = upgrades.sort().join(',');
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCards;
