const assert = require('assert');
const tally = require('../utils/tally');
const cleanDescriptions = require('./cardHelpers/cleanDescriptions.js');
const eliminateCollisions = require('./cardHelpers/eliminateCollisions');
const addKeywords = require('./cardHelpers/addKeywords');
const removeLuaComments = require('../utils/removeLuaComments');
const convertLuaToJs = require('../utils/convertLuaToJs');
const extractRawCards = require('./cardHelpers/extractRawCards');
const inferCardType = require('./cardHelpers/inferCardType');
const debugCard = require('../utils/debugCard');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * /data_scripts/scripts/lang/english.lua
 */
const RARITIES = {
    'CARD_RARITY.BASIC': 'Basic',
    'CARD_RARITY.COMMON': 'Common',
    'CARD_RARITY.UNCOMMON': 'Uncommon',
    'CARD_RARITY.RARE': 'Rare',
    'CARD_RARITY.UNIQUE': 'Unique',
    'CARD_RARITY.BOSS': 'Boss',
    'CARD_RARITY.COSMIC': 'Cosmic',
};

/**
 *
 */
const SERIES = {
    sal: 'Sal',
    rook: 'Rook',
    smith: 'Smith',
    npc: 'Enemy',
    general: 'Other',
    daily: 'Other',
};

/**
 * From "constants.lua"
 */
const DEFAULT_CARD_XP = 10;

/**
 * The following card ids are skipped, even though they have artwork.
 */
const DENIED = {
    choose_diplomacy: true, // hidden in Compendium (hide_in_cardex)
    choose_hostile: true, // hidden in Compendium (hide_in_cardex)
    frisk: true, // this is an internal card (not "admiralty_orders"), with the OPPONENT flag
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
const getCards = (zip, keywords, artIds) => {
    const cards = getRawCards(zip);
    fillUpgrades(cards);

    resolveArtId(cards, artIds);
    console.log('cardsWithArt', tally(cards));

    eliminateCollisions(cards, keywords);

    cleanDescriptions(cards, keywords); // must come after upgrades, because it uses the concatenated enclosures

    addKeywords(cards, keywords, zip);

    fixSomeValues(cards);

    return cards;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getRawCards = (zip) => {
    const entries = zip.getEntries();
    const cards = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const cleanLua = removeLuaComments(entry.getData().toString('utf8'));
            if (cleanLua.match(/\.Add[A-Z]\w+Card\(/)) {
                // if (!entryName.includes('daily_run_battle_cards.lua')) continue;
                // console.log('=============================entryName:', entryName);
                const hybridLua = convertLuaToJs(cleanLua);
                const luaCards = extractRawCards(hybridLua, entryName);
                for (const id in luaCards) {
                    if (!DENIED[id]) {
                        // if (id !== 'abrupt_remark') continue;
                        assert(!cards[id], `Duplicate card "${id}"!`);
                        cards[id] = luaCards[id];
                    }
                }
            }
        }
    }
    console.log('rawCards', tally(cards));
    return cards;
};

/**
 *
 */
const fillUpgrades = (bag) => {
    for (const id in bag) {
        const baseId = getParentId(id);
        if (baseId) {
            assert(bag[baseId], `${id}: Base card "${baseId}" is missing!`);
            bag[id] = {
                ...bag[baseId],
                ...bag[id],
                parent: bag[baseId].name,
            };
            delete bag[id].upgrades;
            bag[id].baseId = baseId;
            if (!bag[baseId].upgrades) {
                bag[baseId].upgrades = [];
            }
            bag[baseId].upgrades.push(bag[id].name);
            if (bag[id].name === bag[baseId].name) {
                bag[id].name += '+'; // "assassins_mark_plus" needs this
            }
        }
    }
    for (const id in bag) {
        const {upgrades} = bag[id];
        if (upgrades) {
            bag[id].upgrades = upgrades.join(',');
        }
    }
};

/**
 *
 */
const resolveArtId = (cards, artIds) => {
    for (const id in cards) {
        const card = cards[id];
        if (!card.icon) {
            const folderName = card.deckType.toLowerCase();
            const artId = card.baseId || card.id;
            card.icon = folderName + '/' + artId;
            if (!artIds[card.icon]) {
                // console.log(`${id}: Unexpected inferred icon path "${card.icon}"!`);
                delete cards[id];
            }
        } else {
            card.icon = card.icon.replace(/\.[^.]*$/, '');
            assert(artIds[card.icon], `${id}: Unexpected given icon path "${card.icon}"!`);
        }
    }
};

/**
 *
 */
const getParentId = (id) => {
    // Somewhat unsafe, since a card name may legitimately contain "_upgraded":
    const cleanId = id.replace(/_plus.*|_upgraded.*/, '');
    return cleanId !== id ? cleanId : '';
};

/**
 *
 */
const fixSomeValues = (bag) => {
    for (const id in bag) {
        const card = bag[id];
        const {rarity, series, name, keywords} = card;

        assert(rarity && RARITIES[rarity], `"${id} (${name}) has an invalid rarity! ${rarity}`);
        card.rarity = RARITIES[rarity];

        if (card.hasOwnProperty('cost') && keywords && keywords.includes('Unplayable')) {
            delete card.cost;
        }

        assert(series, `"${id} (${name}) has no series!`);
        let cleanSeries = series.toLowerCase();
        cleanSeries = cleanSeries.split('card_series.').join('');
        assert(SERIES[cleanSeries], `"${id} (${name}) has an invalid series! ${series}`);
        card.series = SERIES[cleanSeries];

        cleanFlavour(card);

        computeXp(card);

        const minDamage = chooseMinDamage(card);
        if (minDamage !== undefined) {
            card.minDamage = minDamage;
        }
        const maxDamage = chooseMaxDamage(card);
        if (maxDamage !== undefined) {
            card.maxDamage = maxDamage;
        }

        card.cardType = inferCardType(card);
    }
};

/**
 *
 */
const cleanFlavour = (card) => {
    const {flavour} = card;
    if (!flavour) {
        return;
    }
    let draft = flavour.replace(/^['’\s]+/, '');
    draft = draft.replace(/['’\s]+$/, '');
    draft = draft.replace(/\n/g, '<br/>');
    draft = draft.replace(/<b>(.*?)<\/>/g, "'''$1'''");
    draft = draft.replace(/<i>(.*?)<\/>/g, "''$1''");
    draft = draft.split('{1}').join('0'); // "Blacklist"
    debugCard(!draft.replace(/<br\/>/g, '').match(/[{#\\<]/), card, `Flavour is strange: ${draft}`);
    card.flavour = draft;
};

/**
 * Ported from "content.lua"
 */
const computeXp = (card) => {
    const {max_xp, mod_xp, keywords, upgrades, cost, parent} = card;
    if (max_xp === undefined) {
        if (upgrades) {
            let default_xp = DEFAULT_CARD_XP - Math.max(0, 2 * cost - 1);
            if (keywords && keywords.match(/Expend|Finisher/)) {
                default_xp = default_xp - 2;
            } else {
                if (mod_xp) {
                    default_xp = default_xp + mod_xp;
                }
            }
            card.computedXp = Math.max(3, default_xp);
        }
    } else {
        if (parent) {
            delete card['max_xp'];
        } else {
            if (max_xp === 0) {
                delete card['max_xp'];
            } else {
                card.computedXp = max_xp;
            }
        }
    }
};

/**
 *
 */
const chooseMinDamage = (card) => {
    const {min_damage, min_persuasion} = card;
    if (min_damage === undefined) {
        if (min_persuasion === undefined) {
            return undefined;
        } else {
            return min_persuasion;
        }
    } else {
        return min_damage;
    }
};

/**
 *
 */
const chooseMaxDamage = (card) => {
    const {max_damage, max_persuasion} = card;
    if (max_damage === undefined) {
        if (max_persuasion === undefined) {
            return undefined;
        } else {
            return max_persuasion;
        }
    } else {
        return max_damage;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCards;
