const assert = require('assert');
const deshell = require('../../utils/deshell');
const findEnclosure = require('../../utils/findEnclosure');
const obfuscateLuaTexts = require('../../utils/obfuscateLuaTexts');
const restoreLuaTexts = require('../../utils/restoreLuaTexts');
const toBase64 = require('../../utils/toBase64');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CONSTANTS = [
    'ALL_DECKS', // a global constant declared in "card_engine.lua"
    'NoCharges', // a local function declared in "rook_actions.lua"
    'TARGET_ANY_RESOLVE', // a global constant declared in "negotiation_defs.lua"
    'FIGHT_SHAKE_ABILITY', // a global constant declared in "constants.lua"
    'EVENT_PRIORITY_MULTIPLIER', // a global constant declared in "constants.lua"
    'EVENT_PRIORITY_SETTOR', // a global constant declared in "constants.lua"
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

    // if (id === 'assassins_mark') {
    //     console.log('enclosure:', enclosure);
    // }

    draft = draft.split('=').join(':'); // before obfuscation, to avoid replacing "=" in base64
    draft = obfuscateLuaTexts(draft);

    draft = draft.split('math.huge').join('9999');
    draft = draft.replace(/(SoundEvents.\w+)/g, '"$1"');
    draft = draft.replace(/engine\.asset\.Texture\((.*?)\)/g, '$1');
    draft = hideFunctions(draft);
    draft = hideArrays(draft);
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
    return card;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const hideFunctions = (cardContent) => {
    let draft = cardContent;
    const functionsFound = cardContent.matchAll(/:\s*function/g);
    for (const {index} of functionsFound) {
        const functionBlock = findEnclosure(cardContent, index + 1, '{', '}');
        draft = draft.split(functionBlock).join(`"F_${toBase64(functionBlock)}"`);
    }
    return draft;
};
/**
 *
 */
const hideArrays = (cardContent) => {
    let draft = cardContent;
    const arraysFound = draft.matchAll(/:\s*{/g);
    for (const {index} of arraysFound) {
        const arrayBlock = findEnclosure(cardContent, index + 1, '{', '}');
        const interior = deshell(arrayBlock);
        if (!interior.match(/[{}\[\]]/)) {
            if (interior.includes(':')) {
                // nothing, this is a valid json bag
            } else {
                // This is a simple array.
                draft = draft.split(arrayBlock).join('[null, ' + interior + ']'); // lua seems to be 1-based
            }
            continue;
        }
        draft = draft.split(arrayBlock).join(`"A_${toBase64(arrayBlock)}"`);
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
