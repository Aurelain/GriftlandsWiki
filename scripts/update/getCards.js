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
 * The following card ids are skipped, even though they have artwork.
 * They're never displayed as cards to the user (?).
 */
const DENIED = {
    choose_diplomacy: true,
    choose_hostile: true,
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
const getCards0 = (zip, keywords, artIds) => {
    const lowercaseKeywordIds = {};
    for (const keyword in keywords) {
        lowercaseKeywordIds[keyword.toLowerCase()] = keywords[keyword];
    }
    const entries = zip.getEntries();
    const bag = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            collectCardsFromLua(lua, lowercaseKeywordIds, artIds, bag);
        }
    }
    fillUpgrades(bag);
    eliminateCollisions(bag, keywords);
    cleanDescriptions(bag, keywords); // must come after upgrades, because it uses the concatenated enclosures
    addKeywords(bag, keywords, zip);
    fixCosts(bag);
    console.log('getCards', tally(bag));
    return bag;
};

/**
 * Output:
 * {
 *
 * }
 */
const getCards = (zip, keywords, artIds) => {
    const entries = zip.getEntries();
    const cards = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const cleanLua = removeLuaComments(entry.getData().toString('utf8'));
            if (cleanLua.match(/\.Add[A-Z]\w+Card\(/)) {
                // if (!entryName.includes('ai_negotiation.lua')) continue;
                // console.log('=============================entryName:', entryName);
                const hybridLua = convertLuaToJs(cleanLua);
                addCards(extractRawCards(hybridLua, entryName), cards);
            }
        }
    }
    // console.log('getCards', cards);
    console.log('getCards', tally(cards));

    // require('fs').writeFileSync(
    //     'ids.txt',
    //     JSON.stringify(Object.keys(cards).sort(), null, 4).replace(/[ ,"\[\]]/g, '')
    // );
    process.exit();
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const addCards = (addedCards, cards) => {
    for (const id in addedCards) {
        assert(!cards[id], `Duplicate card "${id}"!`);
        cards[id] = addedCards[id];
    }
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
            bag[id].enclosure += bag[baseId].enclosure;
            delete bag[id].upgrades;
            if (!bag[baseId].upgrades) {
                bag[baseId].upgrades = [];
            }
            bag[baseId].upgrades.push(bag[id].name);
        }
    }
    for (const id in bag) {
        const {upgrades} = bag[id];
        if (upgrades) {
            bag[id].upgrades = upgrades.sort().join(',');
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
const fixCosts = (bag) => {
    for (const id in bag) {
        const card = bag[id];
        if (card.hasOwnProperty('cost') && card.keywords && card.keywords.includes('Unplayable')) {
            delete card.cost;
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCards;
