const assert = require('assert');
const tally = require('../utils/tally');
const findEnclosure = require('../utils/findEnclosure');
const removeUndefined = require('../utils/removeUndefined');
const parseDescriptionFormat = require('./parseDescriptionFormat.js');
const cleanDescriptions = require('./cleanDescriptions.js');
const isActualCard = require('./isActualCard');

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
const getCards = (zip, keywords, artIds) => {
    const lowercaseKeywordIds = {};
    for (const keyword in keywords) {
        lowercaseKeywordIds[keyword.toLowerCase()] = true;
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
    checkDuplicateNames(bag, keywords);
    cleanDescriptions(bag, keywords); // must come after upgrades, because it uses the concatenated enclosures
    fixCosts(bag);
    console.log('getCards', tally(bag));
    return bag;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
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
        const art = getArtId(enclosure, id, artIds);
        if (!art) {
            continue;
        }
        if (id in lowercaseKeywordIds && !isActualCard(id, enclosure)) {
            continue;
        }
        const rarity = (enclosure.match(/\s*rarity\s*=\s*(\w+\.\w+)/) || [])[1];
        const flags = (enclosure.match(/\s*flags\s*=\s*([^,\r\n]+)/) || [])[1];
        const name = captureText(enclosure, 'name');

        let desc = captureText(enclosure, 'desc');
        // Exception for "Pinned":
        if (desc && desc.includes('{card.{1}}')) {
            desc = captureText(enclosure, 'NO_CARD');
        }

        bag[id] = removeUndefined({
            name,
            id,
            art,
            desc,
            character: undefined, // TODO
            deckType: artIds[art] ? 'battle' : 'negotiation',
            cardType: parseCardType(flags),
            keywords: parseKeywords(flags, desc),
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
const getArtId = (enclosure, id, artIds) => {
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
        const artId = fileName.split('.')[0];
        assert(artIds[artId] === isBattle, `${id}: Unexpected icon value "${icon}!"`);
        return artId;
    }
    const expectedArtId = getParentId(id) || id;
    return expectedArtId in artIds ? expectedArtId : undefined;
};

/**
 *
 */
const parseKeywords = (flags) => {
    if (!flags) {
        return;
    }
    const keywords = {};
    for (const keyword in KEYWORDS) {
        if (flags.includes(keyword)) {
            keywords[KEYWORDS[keyword]] = true;
        }
    }

    return tally(keywords) ? Object.keys(keywords).sort().join(',') : undefined;
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
const checkDuplicateNames = (bag, keywords) => {
    const keywordNames = {};
    for (const keyword in keywords) {
        const {id, name} = keywords[keyword];
        keywordNames[name] = id;
    }
    const names = {};
    for (const id in bag) {
        const {name} = bag[id];
        if (names[name]) {
            console.log(`${id}: Name collision with id "${names[name]}" for "${name}"!`);
        } else {
            names[name] = id;
        }
        if (keywordNames[name]) {
            console.log(`${id}: Name collision with keyword "${keywordNames[name]}" for "${name}"!`);
        }
    }
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
