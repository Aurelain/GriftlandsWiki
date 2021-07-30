const assert = require('assert');
const removeLuaComments = require('../../utils/removeLuaComments');
const debugCard = require('../../utils/debugCard');

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

const FEATURE_TO_VERB = {
    DOMINANCE: 'Gain ',
    STUN: 'Apply ',
    BLEED: 'Apply ',
    EXPOSED: 'Apply ',
    WOUND: 'Apply ',
    IMPAIR: 'Apply ',
    DEFEND: 'Gain ',
    COMPOSURE: 'Gain ',
    EXERT: '', // Just "Exert."
    COMBO: 'Gain ',
    POWER: 'Gain ',
    INFLUENCE: 'Gain ',
    FREE_ACTION: 'Gain ',
};

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
        addFeaturesToCard(cardsBag[id], globalKeywords);
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
    const {max_charges} = card;
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
    const flags = cleanFlags(card, ranks);
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

    if (max_charges) {
        const consumeName = globalKeywordLowIds['consume'].name;
        const link = '[[' + consumeName + ']]';
        const uses = max_charges > 1 ? 'uses' : 'use';
        const prefix = card.desc ? card.desc + '<br/>' : '';
        card.desc = prefix + `${link} after ${max_charges} ${uses}.`;
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
const cleanFlags = (card, ranks) => {
    const {flags, name, id} = card;
    if (!flags) {
        return [];
    }
    let draft = flags.join(',');
    draft = draft.toLowerCase();
    draft = draft.split('negotiation_flags.').join('');
    draft = draft.split('card_flags.').join(''); // possibly added after `parseCardContent`
    draft = draft.replace(/\s*/g, '');

    const parts = draft.split(',');
    card.flags = parts; // mutation!

    const fresh = [];
    for (const part of parts) {
        if (part in SKIPPED_FLAGS) {
            continue;
        }
        assert(ranks[part], `${id} (${name}): Unrecognized flag "${part}"!`);
        fresh.push(part);
    }
    return fresh;
};

/**
 *
 */
const sortFlags = (flags, ranks) => {
    flags.sort((a, b) => (ranks[a] > ranks[b] ? 1 : -1));
};

/**
 *
 */
const addFeaturesToCard = (card, globalKeywords) => {
    const {features} = card;
    if (features && !Array.isArray(features)) {
        for (const key in features) {
            const value = features[key];
            const verb = FEATURE_TO_VERB[key];
            const keywordInfo = globalKeywords[key];
            debugCard(value > 0, card, 'Feature value should be a positive number!');
            debugCard(keywordInfo, card, `Unrecognized feature! ${key}`);
            const featureDescription = compileFeatureDescription(card, keywordInfo, value);
            const prefix = card.desc ? card.desc + '<br/>' : '';
            card.desc = prefix + `${featureDescription}`;
        }
    }
};

/**
 *
 */
const compileFeatureDescription = (card, {feature_desc, id, name}, value) => {
    debugCard(feature_desc, card, `Missing feature description! ${name}`);

    let draft = feature_desc;

    // Resolve all "foo {1} bar" instances:
    draft = draft.split('{1}').join(value);

    // Also replace the number in "foo {1*card|cards} bar"
    const noun = value === 1 ? '$1' : '$2';
    draft = draft.replace(/{1\*(.*?)\|(.*?)}/g, noun);

    // Change the syntax for numbers inside conditions:
    //      Old: foo {VULNERABILITY 5} bar
    //      New: foo 5 {VULNERABILITY} bar
    draft = draft.replace(/{(\w+) (\d+)}/g, '$2 {$1}');

    // Replace name:
    draft = draft.split('{' + id + '}').join('[[' + name + ']]'); // Note: does nothing for "improvise_carry_over"

    // Fix exert:
    draft = draft.split('1 [[Exert]]').join('[[Exert]]'); // Needed for "Spark Cannon", "Blood Flow" etc.

    debugCard(!draft.includes('{'), card, `There are still some braces! ${draft}`);

    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = addKeywords;
