const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
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
 *
 */
const getNegotiationCards = (lua, luaPath, artIds) => {
    // if (lua.includes('AddNegotiationCardDefs')) {
    // data_scripts/scripts/quest_def.lua contains this function, but is never used.
    // We delete it because
    // }
    const negotiationCards = {};
    const additionsFound = lua.matchAll(/\.AddNegotiationCard\(/g);
    for (const {index} of additionsFound) {
        const enclosure = findEnclosure(lua, index, '(', ')');
        const [, idParameter, defParameter] = enclosure.match(/^[^(]+\(([^,]+),([\s\S]*)/);
        const idClean = cleanId(idParameter, lua);
        if (idClean === 'id') {
            // This is part of a "for" loop.
            const lastForIndex = lua.substring(0, index).lastIndexOf('for ');
            const loopBlock = findEnclosure(lua, lastForIndex, '{', '}');
            assert(loopBlock, `Cannot find "for" block in "${luaPath}"!`);

            const {varName, code} = parseLoopBlock(loopBlock);
            console.log('loopBlock:', loopBlock);
            console.log('varName:', varName);
            console.log('code:', code);
        } else {
            addNegotiationCard(idClean, 1, negotiationCards); // TODO
        }
    }
    return negotiationCards;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const addNegotiationCard = (id, card, negotiationCards) => {
    assert(!negotiationCards[id], `Duplicate negotiation id "${id}"!`);
    negotiationCards[id] = card; //defParameter;
};

/**
 *
 */
const cleanId = (idParameter, lua) => {
    idParameter = idParameter.trim();
    if (idParameter === 'id') {
        return idParameter;
    }
    if (idParameter.charAt(0) === '"') {
        return idParameter.substring(1, idParameter.length - 1);
    }

    // The only ones left are "CARD_BLASPHEMER" and "CARD_OPEN_MIND".
    const declarationFound = lua.match(new RegExp('local.*' + idParameter + '.*'));
    assert(declarationFound, `Cannot find "${idParameter + '.*'}"!`);
    const declarationLine = declarationFound[0].replace(/^local ([^=]*)=(.*)/, 'let [$1]=[$2]');
    const code = `(()=> {${declarationLine}; return ${idParameter};})()`;
    let id;
    try {
        id = eval(code);
    } catch (e) {
        throw new Error(`Could not evaluate code "${code}"!`);
    }
    assert(id, `Unrecognized id "${idParameter}"!`);
    return id;
};

/**
 *
 */
const parseLoopBlock = (loopBlock) => {
    const varName = (loopBlock.match(/pairs\((.*?)\)/) || [null, ''])[1].trim();
    assert(varName, 'Cannot find var name!');

    return {varName};
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getNegotiationCards;
