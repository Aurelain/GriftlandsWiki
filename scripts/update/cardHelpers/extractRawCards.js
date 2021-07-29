const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');
const parseCardContent = require('./parseCardContent');
const parseLoopLines = require('./parseLoopLines');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 *
 */
const DENIED_LOOPS = {
    'self.negotiation_data.defs': true,
    args: true,
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const extractRawCards = (lua, luaPath) => {
    const cards = {};
    const additionsFound = lua.matchAll(/\.Add([A-Z]\w+)Card\(/g);
    for (const addition of additionsFound) {
        const deckType = addition[1];
        const {index} = addition;
        const enclosure = findEnclosure(lua, index, '(', ')');
        const idParameter = enclosure.match(/^[^(]+\(([^,]+),/)[1];
        const idClean = cleanId(idParameter, lua);
        if (idClean === 'k') {
            // scripts/character_def.lua
            continue;
        }
        if (idClean === 'id') {
            // This is part of a "for" loop.
            const lastForIndex = lua.substring(0, index).lastIndexOf('for ');
            const loopBlock = findEnclosure(lua, lastForIndex, '{', '}');
            assert(loopBlock, `Cannot find "for" block in "${luaPath}"!`);

            const {varName, code} = parseLoopBlock(loopBlock);
            if (varName in DENIED_LOOPS) {
                continue;
            }
            const bag = getVarContents(varName, lua, luaPath);
            evaluateLoopBlock(code, bag, cards, deckType);
            // console.log('varName:', varName);
            // console.log('loopBlock:', loopBlock);
            // console.log('bag:', bag);
            // console.log('--------------------------code:');
            // console.log(code);
        } else {
            const card = parseCardContent(enclosure, lua, luaPath, idClean);
            addCard(idClean, card, cards, deckType);
        }
    }
    return cards;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const addCard = (id, card, cards, deckType) => {
    assert(!cards[id], `Duplicate card id "${id}"!`);
    card.id = id;
    card.deckType = deckType;
    cards[id] = card;
};

/**
 *
 */
const cleanId = (idParameter, lua) => {
    idParameter = idParameter.trim();
    if (idParameter === 'id' || idParameter === 'k') {
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
    const lines = parseLoopLines(loopBlock);
    assert(lines.match(/\S/), 'Empty loop interior!');
    const code = `
    (() => {
        for (const id in bag) {
            const ${defName} = bag[id];
            ${lines}
            addCard(id, ${defName}, deckCards, deckType);
        }  
    })()`;
    return {varName, code};
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
        bag[id] = parseCardContent(cardEnclosure, lua, luaPath, id);
    }
    return bag;
};

/**
 *
 */
const evaluateLoopBlock = (code, bag, deckCards, deckType) => {
    try {
        eval(code);
    } catch (e) {
        assert(false, `Could not evaluate loop: ${e.message}!\n${code}`);
    }
};

// noinspection JSUnusedLocalSymbols
/**
 * Needed by `eval` in `evaluateLoopBlock`
 */
const CheckBits = (list, ...args) => {
    if (!list) {
        return false;
    }
    for (const item of args) {
        if (!list.includes(item)) {
            return false;
        }
    }
    return true;
};

// noinspection JSUnusedLocalSymbols
/**
 * Needed by `eval` in `evaluateLoopBlock`
 */
const CheckAnyBits = (list, ...args) => {
    if (!list) {
        return false;
    }
    for (const item of args) {
        if (list.includes(item)) {
            return true;
        }
    }
    return false;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractRawCards;
