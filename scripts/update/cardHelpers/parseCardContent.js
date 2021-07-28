const assert = require('assert');
const deshell = require('../../utils/deshell');
const findEnclosure = require('../../utils/findEnclosure');
const obfuscateLuaTexts = require('../../utils/obfuscateLuaTexts');
const restoreLuaTexts = require('../../utils/restoreLuaTexts');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CONSTANTS = [
    'TARGET_ANY_RESOLVE',
    'EVENT_PRIORITY_MULTIPLIER',
    'EVENT_PRIORITY_ADDITIVE',
    'table.empty',
    'ALL_DECKS',
];

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const parseCardContent = (enclosure, luaPath, id) => {
    let draft = deshell(enclosure);

    draft = convertConstants(draft, id);

    draft = obfuscateLuaTexts(draft);

    draft = draft.split('=').join(':');
    draft = removeFunctions(draft);
    draft = adaptArrays(draft);
    draft = adaptFlags(draft);

    draft = restoreLuaTexts(draft);

    const code = '({' + draft + '})';
    let card;
    try {
        card = eval(code);
        // console.log('card:', card);
    } catch (e) {
        assert(false, `Card could not be parsed! ${e.message}\n${code}`);
    }
    return card;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const removeFunctions = (cardContent) => {
    let draft = cardContent;
    const functionsFound = cardContent.matchAll(/:\s*function/g);
    for (const {index} of functionsFound) {
        const functionBlock = findEnclosure(cardContent, index, '{', '}');
        // TODO: salvage some information
        draft = draft.split(functionBlock).join(': "function"');
    }
    return draft;
};
/**
 *
 */
const adaptArrays = (cardContent) => {
    let draft = cardContent;
    const arraysFound = draft.matchAll(/:\s*{/g);
    for (const {index} of arraysFound) {
        const arrayBlock = findEnclosure(cardContent, index, '{', '}');
        // TODO: salvage some information
        draft = draft.split(arrayBlock).join(': "object"');
    }
    return draft;
};

/**
 *
 */
const adaptFlags = (cardContent) => {
    return cardContent.replace(/(\bflags\s*:)([^,}]*)/g, flagsReplacer);
};

/**
 *
 */
const flagsReplacer = (line, flagsProp, flagsValue) => {
    flagsValue = flagsValue.split('|').join(',');
    flagsValue = flagsValue.split('negotiation_defs.').join('');
    return flagsProp + '[' + flagsValue + ']';
};

/**
 *
 */
const convertConstants = (cardContent) => {
    for (const name of CONSTANTS) {
        cardContent = cardContent.split(name).join(`"${name}"`);
    }
    return cardContent.replace(/([A-Z_0-9]+\.[A-Z_0-9]+)/g, '"$1"');
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = parseCardContent;
