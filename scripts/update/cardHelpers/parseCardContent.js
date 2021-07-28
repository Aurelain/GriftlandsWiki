const assert = require('assert');
const deshell = require('../../utils/deshell');
const findEnclosure = require('../../utils/findEnclosure');
const obfuscateLuaTexts = require('../../utils/obfuscateLuaTexts');
const restoreLuaTexts = require('../../utils/restoreLuaTexts');
const parseDescriptionFormat = require('./parseDescriptionFormat');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CONSTANTS = [
    'ALL_DECKS', // a global constant declared in "card_engine.lua"
    'NoCharges', // a local function declared in "rook_actions.lua"
    'TARGET_ANY_RESOLVE', // a global constant declared in "negotiation_defs.lua"
    'FIGHT_SHAKE_ABILITY', // a global constant declared in "constants.lua"
    'table.empty', // unknown, in "ai_negotiation.lua"
];

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const parseCardContent = (enclosure, lua, luaPath, id) => {
    let draft = deshell(enclosure);

    const descriptionFormat = parseDescriptionFormat(enclosure, id);

    draft = obfuscateLuaTexts(draft);

    draft = draft.split('=').join(':');
    draft = draft.split('math.huge').join('9999');
    draft = draft.replace(/(SoundEvents.\w+)/g, '"$1"');
    draft = draft.replace(/engine\.asset\.Texture\((.*?)\)/g, '$1');
    draft = removeFunctions(draft);
    draft = adaptArrays(draft);
    draft = adaptFlags(draft);
    draft = convertConstants(draft, lua);

    draft = restoreLuaTexts(draft);

    const code = '({' + draft + '})';
    let card;
    try {
        card = eval(code);
        // console.log('card:', card);
    } catch (e) {
        console.log('enclosure:', enclosure);
        assert(false, `Card could not be parsed! ${e.message}\n${code}`);
    }
    if (descriptionFormat) {
        card.desc_fn = descriptionFormat;
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
    flagsValue = flagsValue.replace(/\w+_defs\./g, '');
    return flagsProp + '[' + flagsValue + ']';
};

/**
 *
 */
const convertConstants = (cardContent, lua) => {
    for (const name of CONSTANTS) {
        cardContent = cardContent.split(name).join(`"${name}"`);
    }
    cardContent = cardContent.replace(/([A-Z_0-9]+\.[A-Z_0-9]+)/g, '"$1"');
    const constantsFound = cardContent.matchAll(/:\s*([A-Z]\w+)/g);
    for (const [, constantName] of constantsFound) {
        const declarationFound = lua.match(new RegExp('\\b' + constantName + '\\s*=(.*)'));
        if (declarationFound) {
            const value = declarationFound[1].trim();
            cardContent = cardContent.split(constantName).join(value);
        }
    }
    return cardContent;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = parseCardContent;
