const assert = require('assert');
const tally = require('../utils/tally');
const findEnclosure = require('../utils/findEnclosure');
const removeUndefined = require('../utils/removeUndefined');
const parseDescriptionFormat = require('./cardHelpers/parseDescriptionFormat.js');
const cleanDescriptions = require('./cardHelpers/cleanDescriptions.js');
const isActualCard = require('./cardHelpers/isActualCard');
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
const collectCardsFromLua = (luaContent, lowercaseKeywordIds, artIds, bag) => {
    let draft = luaContent.replace(/--\[\[[\s\S]*?]]--/g, ''); // remove block comments
    draft = draft.replace(/--.*/g, ''); // remove  comments
    draft = removeBlocks(draft, /GRAFTS\s*=/);
    draft = removeBlocks(draft, /\bevent_handlers\s*=/);
    draft = removeBlocks(draft, /\bmodifier\s*=/);

    const nameMatches = draft.matchAll(/(\w+)\s*=\s*{[^{}]*\bname\s*=\s*"/g);
    for (const nameMatch of nameMatches) {
        let enclosure = findEnclosure(draft, nameMatch.index, '{', '}');
        const id = nameMatch[1];
        if (id in DENIED) {
            continue;
        }
        // if (id !== 'aerostat_coilgun') {
        //     continue;
        // }
        const {artId, deckType} = getArtIdAndDeckType(enclosure, id, artIds) || {};
        if (!artId) {
            continue;
        }
        if (id in lowercaseKeywordIds && !isActualCard(id, enclosure)) {
            continue;
        }
        const rarity = (enclosure.match(/\s+rarity\s*=\s*(\w+\.\w+)/) || [])[1];
        const flags = (enclosure.match(/\s+flags\s*=\s*([^,\r\n]+)/) || [])[1];
        const name = captureText(enclosure, 'name');

        let desc = captureText(enclosure, 'desc');
        // Exception for "Pinned":
        if (desc && desc.includes('{card.{1}}')) {
            desc = captureText(enclosure, 'NO_CARD');
        }

        bag[id] = removeUndefined({
            name,
            id,
            art: artId,
            desc,
            character: undefined, // TODO
            deckType,
            cardType: parseCardType(flags),
            keywords: flags, // handled furthermore in `addKeywords()`
            flavour: cleanFlavour(captureText(enclosure, 'flavour')),
            rarity: RARITIES[rarity],
            parent: undefined,
            upgrades: undefined,
            cost: captureNumber(enclosure, 'cost'),
            xp: captureNumber(enclosure, 'max_xp'),
            minDamage: captureNumber(enclosure, 'min_damage'),
            maxDamage: captureNumber(enclosure, 'max_damage'),
            enclosure, // internal
            descParams: parseDescriptionFormat(desc, enclosure, name), // internal
            maxCharges: captureNumber(enclosure, 'max_charges'), // internal, used by `addKeywords()`
        });
    }
};

/**
 *
 */
const removeBlocks = (content, regExp) => {
    while (true) {
        const found = content.match(regExp);
        if (!found) {
            return content;
        }
        const enclosure = findEnclosure(content, found.index, '{', '}');
        content = content.split(enclosure).join(',');
    }
};

/**
 *
 */
const captureNumber = (text, prop) => {
    const re = new RegExp('\\s*\\b' + prop + '\\s*=\\s*(\\d+)');
    const found = text.match(re);
    if (found) {
        return Number(found[1]);
    }
};

/**
 *
 */
const captureText = (text, prop) => {
    const re = new RegExp('\\s*\\b' + prop + '\\s*=\\s*"([\\s\\S]+?)"');
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
const parseCardType = (flags) => {
    if (!flags) {
        return;
    }
    return undefined; // TODO
};

/**
 *
 */
const getArtIdAndDeckType = (enclosure, id, artIds) => {
    const icon = captureText(enclosure, 'icon');
    if (icon) {
        // Happens rarely, when a card overrides the expected art id, e.g. "xxx".
        const parts = icon.split('/');
        const [folderName, fileName] = parts;
        const isBattle = folderName === 'battle';
        if (!isBattle && folderName !== 'negotiation') {
            // This is not a card
            // console.log(`${id}: Not a card, based on icon: "${icon}"`);
            return;
        }
        if (parts.length !== 2) {
            // This is a condition or a modifier
            // console.log(`${id}: Unexpected icon path "${icon}"!`);
            return;
        }
        return {
            artId: fileName.split('.')[0],
            deckType: isBattle ? 'Battle' : 'Negotiation',
        };
    }
    const expectedArtId = getParentId(id) || id;
    if (expectedArtId in artIds) {
        return {
            artId: expectedArtId,
            deckType: artIds[expectedArtId] ? 'Battle' : 'Negotiation',
        };
    }
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
        const {rarity, series, flavour, name, keywords} = card;

        assert(rarity && RARITIES[rarity], `"${id} (${name}) has an invalid rarity! ${rarity}`);
        card.rarity = RARITIES[rarity];

        if (card.hasOwnProperty('cost') && keywords && keywords.includes('Unplayable')) {
            delete card.cost;
        }

        if (flavour) {
            let cleanFlavour = flavour.replace(/^['’\s]+/m, '');
            cleanFlavour = cleanFlavour.replace(/['’\s]+$/m, '');
            if (cleanFlavour.includes('{')) {
                debugCard(card, `Special flavour will be deleted: ${cleanFlavour}`);
                delete card.flavour; // "Blacklist"
            } else {
                card.flavour = cleanFlavour;
            }
        }

        assert(series, `"${id} (${name}) has no series!`);
        let cleanSeries = series.toLowerCase();
        cleanSeries = cleanSeries.split('card_series.').join('');
        assert(SERIES[cleanSeries], `"${id} (${name}) has an invalid series! ${series}`);
        card.series = SERIES[cleanSeries];

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
 * Ported from "content.lua"
 */
const computeXp = (card) => {
    if (card.max_xp === undefined) {
        if (card.upgrades) {
            let default_xp = DEFAULT_CARD_XP - Math.max(0, 2 * card.cost - 1);
            if (card.keywords && card.keywords.match(/Expend|Finisher/)) {
                default_xp = default_xp - 2;
            } else {
                if (card.mod_xp) {
                    default_xp = default_xp + card.mod_xp;
                }
            }
            card.computedXp = Math.max(3, default_xp);
        }
    } else {
        if (card.parent) {
            delete card.max_xp;
        } else {
            if (card.max_xp === 0) {
                delete card.max_xp;
            } else {
                card.computedXp = card.max_xp;
            }
        }
    }
};

/**
 *
 */
const chooseMinDamage = (card) => {
    if (card.min_damage === undefined) {
        if (card.min_persuasion === undefined) {
            return undefined;
        } else {
            return card.min_persuasion;
        }
    } else {
        return card.min_damage;
    }
};

/**
 *
 */
const chooseMaxDamage = (card) => {
    if (card.max_damage === undefined) {
        if (card.max_persuasion === undefined) {
            return undefined;
        } else {
            return card.max_persuasion;
        }
    } else {
        return card.max_damage;
    }
};
// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCards;
