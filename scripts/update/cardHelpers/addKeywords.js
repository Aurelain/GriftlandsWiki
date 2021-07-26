const assert = require('assert');
const removeLuaComments = require('../../utils/removeLuaComments');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const SKIPPED_FLAGS = {
    status: true,
    skill: true,
    ranged: true,
    melee: true,
    freebie: true,
    item: true,
    manipulate: true,
    hostile: true,
    diplomacy: true,
    variable_cost: true,
};
const BATTLE_FLAGS_FILE = 'scripts/battle/battle_defs.lua';
const NEGOTIATION_FLAGS_FILE = 'scripts/negotiation/negotiation_defs.lua';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const addKeywords = (cardsBag, globalKeywords, zip) => {
    const flagRanks = {
        battle: getFlagRanks(zip, BATTLE_FLAGS_FILE),
        negotiation: getFlagRanks(zip, NEGOTIATION_FLAGS_FILE),
    };

    const globalKeywordNames = {};
    const globalKeywordLowIds = {};
    for (const id in globalKeywords) {
        globalKeywordNames[globalKeywords[id].name] = globalKeywords[id];
        globalKeywordLowIds[id.toLowerCase()] = globalKeywords[id];
    }

    for (const id in cardsBag) {
        addKeywordsToCard(cardsBag[id], globalKeywordNames, globalKeywordLowIds, flagRanks);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getFlagRanks = (zip, entryPath) => {
    const lua = removeLuaComments(zip.getEntry(entryPath).getData().toString('utf8'));
    const flagsList = lua.match(/CARD_FLAG_BITSTRINGS[^{]*{([^}]*)}/)[1];
    const list = eval('[' + flagsList + ']');
    const ranks = {};
    for (let i = 0; i < list.length; i++) {
        ranks[list[i].toLowerCase()] = i + 1;
    }
    return ranks;
};

/**
 *
 */
const addKeywordsToCard = (card, globalKeywordNames, globalKeywordLowIds, flagRanks) => {
    const {maxCharges} = card;
    const usedBag = {};
    const allKeywords = [];

    const linksFound = (card.desc || '').matchAll(/\[\[([^|\]]+)/g);
    for (const [, linkFound] of linksFound) {
        if (linkFound in globalKeywordNames && !(linkFound in usedBag)) {
            allKeywords.push(linkFound);
            usedBag[linkFound] = true;
        }
    }

    const ranks = card.deckType === 'Battle' ? flagRanks.battle : flagRanks.negotiation;
    const flags = cleanFlags(card.keywords, ranks, card.name);
    sortFlags(flags, ranks);
    const internalKeywords = [];
    for (const flag of flags) {
        const globalKeyword = globalKeywordLowIds[flag];
        assert(globalKeyword, `${card.name}: Cannot resolve flag "${flag}"!`);
        const {name} = globalKeyword;
        internalKeywords.push(name);
        if (!(name in usedBag)) {
            allKeywords.push(name);
            usedBag[name] = true;
        }
    }

    if (internalKeywords.length) {
        const wikiKeywords = '[[' + internalKeywords.join(']], [[') + ']]';
        const prefix = card.desc ? card.desc + '<br/>' : '';
        card.desc = prefix + wikiKeywords;
    }

    if (maxCharges) {
        const consumeName = globalKeywordLowIds['consume'].name;
        const link = '[[' + consumeName + ']]';
        const uses = maxCharges > 1 ? 'uses' : 'use';
        const prefix = card.desc ? card.desc + '<br/>' : '';
        card.desc = prefix + `${link} after ${maxCharges} ${uses}.`;
        if (!allKeywords.includes(consumeName)) {
            allKeywords.push(consumeName);
        }
    }

    if (allKeywords.length) {
        card.keywords = allKeywords.join(',');
    } else {
        delete card.keywords;
    }
};

/**
 *
 */
const cleanFlags = (flagsDump, ranks, name) => {
    if (!flagsDump) {
        return [];
    }
    let draft = flagsDump;
    draft = draft.toLowerCase();
    draft = draft.split('negotiation_flags.').join('');
    draft = draft.split('negotiation_defs.').join('');
    draft = draft.split('battle_defs.').join('');
    draft = draft.split('card_flags.').join('');
    draft = draft.replace(/\s*/g, '');

    const flags = [];
    const parts = draft.split('|');
    for (const part of parts) {
        if (part in SKIPPED_FLAGS) {
            continue;
        }
        assert(ranks[part], `${name}: Unrecognized flag "${part}"!`);
        flags.push(part);
    }
    return flags;
};

/**
 *
 */
const sortFlags = (flags, ranks) => {
    flags.sort((a, b) => (ranks[a] > ranks[b] ? 1 : -1));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = addKeywords;
