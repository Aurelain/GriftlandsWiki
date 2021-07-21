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
            parseConditionsFromLua(lua, output);
            parseCardConditions(lua, output);
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
    const strings = findEnclosure(luaContent, luaContent.indexOf('CARD_FLAG_STRINGS'), '{', '}');
    strings.replace(/\[\w+\.(\w+)]\s*=\s*"(.*?)"/g, (matched, id, name) => {
        keywords[id] = {
            id,
            name,
        };
    });
    const details = findEnclosure(luaContent, luaContent.indexOf('CARD_FLAG_DETAILS'), '{', '}');
    details.replace(/\[\w+\.(\w+)]\s*=\s*"(.*?)"/g, (matched, id, detail) => {
        // Note: Some keywords have no name, but have a description (e.g. ONE_OF_A_KIND);
        if (id in keywords) {
            keywords[id].desc = detail;
        }
    });
};

/**
 *
 */
const parseConditionsFromLua = (luaContent, keywords) => {
    luaContent = removeLuaComments(luaContent);
    const conditionsRegExp = /conditions\s*=\s*{|modifiers\s*=\s*{|FEATURES\s*=\s*{/gi;
    let myResult;
    while ((myResult = conditionsRegExp.exec(luaContent)) !== null) {
        const index = conditionsRegExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(luaContent, index, '{', '}');
        if (!enclosure) {
            continue;
        }
        parseConditionsFromBlock(enclosure, keywords);
    }
};

/**
 *
 */
const parseConditionsFromBlock = (block, keywords) => {
    const regExp = /\w+\s*=\s*{[^{}]*?\bname\s*=\s*"/g;
    let myResult;
    while ((myResult = regExp.exec(block)) !== null) {
        const index = regExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(block, index, '{', '}');
        if (!enclosure) {
            continue;
        }
        const id = enclosure.match(/\w+/)[0];
        const name = enclosure.match(/\bname\s*=\s*"(.*?)"/)[1];
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

/**
 *
 */
const parseCardConditions = (luaContent, keywords) => {
    const regExp = /AddCondition\(".*?"[^{}]*condition\s*=\s*{/g;
    let myResult;
    while ((myResult = regExp.exec(luaContent)) !== null) {
        const index = regExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(luaContent, index, '{', '}');
        if (!enclosure) {
            continue;
        }
        const id = enclosure.match(/AddCondition\("(.*?)"/)[1];
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
