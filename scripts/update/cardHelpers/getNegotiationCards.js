const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');
const parseCardContent = require('./parseCardContent');

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
        const idParameter = enclosure.match(/^[^(]+\(([^,]+),/)[1];
        const idClean = cleanId(idParameter, lua);
        if (idClean === 'id') {
            // This is part of a "for" loop.
            const lastForIndex = lua.substring(0, index).lastIndexOf('for ');
            const loopBlock = findEnclosure(lua, lastForIndex, '{', '}');
            assert(loopBlock, `Cannot find "for" block in "${luaPath}"!`);

            const {varName, code} = parseLoopBlock(loopBlock);
            const bag = getVarContents(varName, lua, luaPath);
            evaluateLoopBlock(code, bag, negotiationCards);
            // console.log('varName:', varName);
            // console.log('loopBlock:', loopBlock);
            // console.log('bag:', bag);
            // console.log('--------------------------code:');
            // console.log(code);
        } else {
            const card = parseCardContent(enclosure, luaPath, idClean);
            addNegotiationCard(idClean, card, negotiationCards);
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
    const defName = (loopBlock.match(/(\w+) in/) || [])[1];
    assert(defName, 'Cannot find def name!');
    const lines = parseLines(loopBlock.replace(/^[^{]*{/, '').replace(/}[^}]*$/, ''));
    assert(lines.match(/\S/), 'Empty loop interior!');
    const code = `
    (() => {
        for (const id in bag) {
            const ${defName} = bag[id];
            ${lines}
            addNegotiationCard(id, ${defName}, negotiationCards);
        }  
    })()`;
    return {varName, code};
};

/**
 *
 */
const parseLines = (lines) => {
    lines = lines.replace(/.*\bassert\b.*/g, '');
    lines = lines.replace(/ or /g, '||');
    lines = lines.replace(/.*AddNegotiationCard.*/g, '');
    return 'true';
    return lines;
};
/**
 *
 */
const getVarContents = (varName, lua, luaPath) => {
    // require('fs').writeFileSync('file.lua', lua);
    const varIndex = lua.indexOf(`local ${varName} =`);
    if (varIndex < 0) {
        console.log(`Warning: Cannot find index of "${varName}"!`);
        return {};
    }

    const enclosure = findEnclosure(lua, varIndex, '{', '}');
    assert(enclosure, `Cannot find enclosure of "${varName}"!`);
    // require('fs').writeFileSync('enclosure.lua', enclosure);

    const bag = {};
    let index = enclosure.indexOf('{') + 1;
    while (true) {
        const cardEnclosure = findEnclosure(enclosure, index, '{', '}');
        if (!cardEnclosure) {
            break;
        }
        index += cardEnclosure.length;
        const id = (cardEnclosure.match(/\w+/) || [''])[0];
        assert(id, `Cannot find id in "${cardEnclosure}"!`);
        assert(!bag[id], `Duplicate id "${id}" in "${cardEnclosure}"!`);
        bag[id] = parseCardContent(cardEnclosure, luaPath, id);
    }
    return bag;
};

/**
 *
 */
const evaluateLoopBlock = (code, bag, negotiationCards) => {
    try {
        eval(code);
    } catch (e) {
        throw new Error(`Could not evaluate loop "${code}"!`);
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getNegotiationCards;
