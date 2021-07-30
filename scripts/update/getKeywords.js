const findEnclosure = require('../utils/findEnclosure');
const removeLuaComments = require('../utils/removeLuaComments');
const deshell = require('../utils/deshell');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const BATTLE_FLAGS_FILE = 'scripts/battle/battle_defs.lua';
const NEGOTIATION_FLAGS_FILE = 'scripts/negotiation/negotiation_defs.lua';
const AI_KEYWORDS = 'scripts/content/negotiation/ai_negotiation.lua';

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

    // The following exceptions are needed because "ai_negotiation.lua" calls its keywords "CARDS".
    // Should we parse the whole file, we would also get some actual cards (e.g. "baffled").
    const aiNegotiation = removeLuaComments(zip.getEntry(AI_KEYWORDS).getData().toString('utf8'));
    parseKeyword('bog_boil', aiNegotiation, output); // referenced in descriptions
    parseKeyword('frisk', aiNegotiation, output); // referenced in descriptions

    // Manual overrides:
    output['SNAILS'].name = 'Snails'; // was "<p img='icons/ic_coin_snails.tex' scale=1.0>"
    output['HEADS'].name = 'Heads'; // was "<p img='icons/ic_coin_heads.tex' scale=1.0>",
    output['HEADS_AND_SNAILS'].name = 'Heads and Snails'; // was "Heads <...> and Snails <...>"
    output['HATCH'] = {...output['HATCH_X'], name: 'Hatch'}; // because "HATCH" is the keyword, not "HATCH_X"

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
    const bitstrings = findEnclosure(luaContent, luaContent.indexOf('CARD_FLAG_BITSTRINGS'), '{', '}');
    const interior = JSON.parse('[' + deshell(bitstrings).trim().replace(/,$/, '') + ']');
    for (const bitstring of interior) {
        if (!(bitstring in keywords)) {
            keywords[bitstring] = {
                id: bitstring,
                name: bitstring.toLowerCase(),
            };
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
        parseBlocks(enumerationBlock, /(\w+)\s*=\s*{[^{}]*?\bname\s*=\s*"(.*?)"/g, keywords);
    }
    parseBlocks(luaContent, /AddCondition\("(.*?)"[^{}]*condition\s*=\s*{/g, keywords);
    parseBlocks(luaContent, /\bmodifier\s*=\s*{/g, keywords);
    parseBlocks(luaContent, /\bAddNegotiationModifier\(\s*"(.*?)"/g, keywords);
};

/**
 *
 */
const parseBlocks = (luaContent, regexp, keywords) => {
    const foundBlocks = luaContent.matchAll(regexp);
    for (const foundBlock of foundBlocks) {
        const enclosure = findEnclosure(luaContent, foundBlock.index, '{', '}');
        const id = foundBlock[1] || (enclosure.match(/\bid\s*=\s*"(.*?)"/) || [])[1];
        const name = (enclosure.match(/\bname\s*=\s*"(.*?)"/) || [])[1];
        if (!id || !name) {
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
        const feature_desc = (enclosure.match(/\bfeature_desc\s*=\s*"([^"]*)/) || [])[1];
        if (feature_desc) {
            keywords[id].feature_desc = feature_desc;
        }
    }
};

/**
 *
 */
const parseKeyword = (keyword, content, keywords) => {
    const index = content.indexOf(keyword + ' =');
    const cardsBlock = findEnclosure(content, index, '{', '}');
    parseBlocks(cardsBlock, /(\w+)\s*=\s*{[^{}]*?\bname\s*=\s*"(.*?)"/g, keywords);
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getKeywords;
