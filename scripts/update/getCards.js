const assert = require('assert');
const tally = require('../utils/tally');
const findEnclosure = require('../utils/findEnclosure');
const removeUndefined = require('../utils/removeUndefined');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
let count = 0;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *
 * }
 */
const getCards = (zip) => {
    const entries = zip.getEntries();
    const output = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            const cards = collectCardsFromLua(lua, entryName);
            Object.assign(output, cards);
        }
    }
    fillUpgrades(output);
    console.log('count', tally(output));
    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const collectCardsFromLua = (luaContent, luaName) => {
    let draft = luaContent.replace(/--.*/g, ''); // remove comments
    const isNegotiation = draft.includes('AddNegotiationCard');
    const isBattle = draft.includes('AddBattleCard');
    if (!isNegotiation && !isBattle) {
        // return;
    }
    const nameRegExp = /\w+\s*=\s*{\s*name\s*=\s*"/g;
    let myResult;
    const output = {};
    while ((myResult = nameRegExp.exec(draft)) !== null) {
        const index = nameRegExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(draft, index, '{', '}');
        if (!enclosure) {
            // TODO: investigate why this happens
            continue;
        }
        const id = enclosure.match(/\w+/)[0];
        const rarity = (enclosure.match(/\s*rarity\s*=\s*(\w+\.\w+)/) || [])[1];
        const isUpgrade = id.includes('_plus');
        const isCard = rarity || isUpgrade;
        if (!isCard) {
            continue;
        }
        const name = captureText(enclosure, 'name');
        output[id] = removeUndefined({
            id,
            name,
            desc: captureText(enclosure, 'desc'),
            rarity,
            flavour: captureText(enclosure, 'flavour') || ' ',
            cost: captureNumber(enclosure, 'cost'),
            xp: captureNumber(enclosure, 'max_xp'),
            minDamage: captureNumber(enclosure, 'min_damage'),
            maxDamage: captureNumber(enclosure, 'min_damage'),
        });
    }
    return output;
};

/**
 *
 */
const captureNumber = (text, prop) => {
    const re = new RegExp('\\s*' + prop + '\\s*=\\s*(\\d+)');
    const found = text.match(re);
    if (found) {
        return Number(found[1]);
    }
};

/**
 *
 */
const captureText = (text, prop) => {
    const re = new RegExp('\\s*' + prop + '\\s*=\\s*"([\\s\\S]+?)"');
    const found = text.match(re) || [];
    return found[1];
};

/**
 *
 */
const fillUpgrades = (bag) => {
    for (const id in bag) {
        const plusIndex = id.indexOf('_plus');
        if (plusIndex > 0) {
            const base = id.substr(0, plusIndex);
            assert(bag[base], 'Base card is missing!');
            bag[id] = {
                ...bag[base],
                ...bag[id],
                parent: base,
            };
            for (const prop in bag[id]) {
                if (prop.startsWith('upgrade')) {
                    delete bag[id][prop];
                }
            }
            let i = 1;
            while (true) {
                if (bag[base]['upgrade' + i]) {
                    i++;
                } else {
                    bag[base]['upgrade' + i] = id;
                    break;
                }
            }
        }
    }
};
// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCards;
