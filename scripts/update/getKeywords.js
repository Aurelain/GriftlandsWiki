const findEnclosure = require('../utils/findEnclosure');
const removeLuaComments = require('../utils/removeLuaComments');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const BATTLE_FLAGS_FILE = 'scripts/battle/battle_defs.lua';
const NEGOTIATION_FLAGS_FILE = 'scripts/negotiation/negotiation_defs.lua';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *     UNPLAYABLE: {
 *          id: 'UNPLAYABLE',
 *          name: 'Unplayable',
 *          desc: 'This card cannot be played.',
 *     },
 *     ...
 * }
 */
const getKeywords = (zip) => {
    const entries = zip.getEntries();
    const output = {};

    parseFlagKeywords(zip.getEntry(BATTLE_FLAGS_FILE).getData().toString('utf8'), output);
    parseFlagKeywords(zip.getEntry(NEGOTIATION_FLAGS_FILE).getData().toString('utf8'), output); // same as battle

    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            parseKeywordsFromLua(lua, output);
        }
    }

    // Manual overrides:
    output['SNAILS'].name = 'Snails'; // was "<p img='icons/ic_coin_snails.tex' scale=1.0>"
    output['HEADS'].name = 'Heads'; // was "<p img='icons/ic_coin_heads.tex' scale=1.0>",
    output['HEADS_AND_SNAILS'].name = 'Heads and Snails'; // was "Heads <...> and Snails <...>"

    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const parseFlagKeywords = (luaContent, keywords) => {
    luaContent = removeLuaComments(luaContent);
    const namesBlock = findEnclosure(luaContent, luaContent.indexOf('CARD_FLAG_STRINGS'), '{', '}');
    const foundNames = namesBlock.matchAll(/\[\w+\.(\w+)]\s*=\s*"(.*?)"/g);
    for (const [, id, name] of foundNames) {
        keywords[id] = {
            id,
            name,
        };
    }
    const detailsBlock = findEnclosure(luaContent, luaContent.indexOf('CARD_FLAG_DETAILS'), '{', '}');
    const foundFlags = detailsBlock.matchAll(/\[\w+\.(\w+)]\s*=\s*"(.*?)"/g);
    for (const [, id, detail] of foundFlags) {
        if (id in keywords) {
            keywords[id].desc = detail;
        }
    }
};

/**
 *
 */
const parseKeywordsFromLua = (luaContent, keywords) => {
    luaContent = removeLuaComments(luaContent);
    const foundBlocks = luaContent.matchAll(/conditions\s*=\s*{|modifiers\s*=\s*{|FEATURES\s*=\s*{/gi);
    for (const {index} of foundBlocks) {
        const enumerationBlock = findEnclosure(luaContent, index, '{', '}');
        parseKeywordsFromEnumeration(enumerationBlock, keywords);
    }
    parseCardKeyword(luaContent, keywords);
};

/**
 *
 */
const parseKeywordsFromEnumeration = (enumerationBlock, keywords) => {
    const foundKeywords = enumerationBlock.matchAll(/(\w+)\s*=\s*{[^{}]*?\bname\s*=\s*"(.*?)"/g);
    for (const foundKeyword of foundKeywords) {
        const [, id, name] = foundKeyword;
        keywords[id] = {
            id,
            name,
        };
        const keywordBlock = findEnclosure(enumerationBlock, foundKeyword.index, '{', '}');
        const desc = (keywordBlock.match(/\bdesc\s*=\s*"([^"]*)/) || [])[1];
        if (desc) {
            keywords[id].desc = desc;
        }
    }
};

/**
 *
 */
const parseCardKeyword = (luaContent, keywords) => {
    const cardKeywords = luaContent.matchAll(/AddCondition\("(.*?)"[^{}]*condition\s*=\s*{/g);
    for (const cardKeyword of cardKeywords) {
        const enclosure = findEnclosure(luaContent, cardKeyword.index, '{', '}');
        const [, id] = cardKeyword;
        const name = (enclosure.match(/\bname\s*=\s*"(.*?)"/) || [])[1];
        if (!name) {
            continue;
        }
        keywords[id] = {
            id,
            name,
        };
        const desc = (enclosure.match(/\bdesc\s*=\s*"([^"]*)/) || [])[1];
        if (desc) {
            keywords[id].desc = desc;
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getKeywords;
