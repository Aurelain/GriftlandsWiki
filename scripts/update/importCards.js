const assert = require('assert');
const fs = require('fs');
const removeUndefined = require('../utils/removeUndefined');
const prettyName = require('../utils/prettyName');
const tally = require('../utils/tally');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CARDS_DIR = 'D:/wikitextFiles2';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *
 * }
 */
const importCards = () => {
    const list = fs.readdirSync(CARDS_DIR);
    const output = {};
    for (const file of list) {
        const name = file.split('.')[0];
        const wikitext = fs.readFileSync(CARDS_DIR + '/' + file, 'utf8');
        const card = parseCardContent(wikitext, name);
        output[card.id] = card;
    }
    console.log('importCards', tally(output));
    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const parseCardContent = (wikitext, fileName) => {
    return removeUndefined({
        name: prettyName(fileName),
        id: fileName,
        desc: getField(wikitext, 'description'),
        character: getField(wikitext, 'character'),
        deckType: getField(wikitext, 'decktype'),
        cardType: getField(wikitext, 'cardtype'),
        keywords: cleanKeywords(getField(wikitext, 'keywords')),
        flavour: cleanFlavour(getField(wikitext, 'quote')),
        rarity: getField(wikitext, 'rarity'),
        parent: getField(wikitext, 'parent'),
        upgrades: getUpgrades(wikitext),
        specials: undefined,
        generator: getField(wikitext, 'generator'),
        cost: parseNumber(getField(wikitext, 'cost')),
        xp: parseNumber(getField(wikitext, 'expreq')),
        minDamage: undefined,
        maxDamage: undefined,
    });
};

/**
 *
 */
const getField = (text, fieldName) => {
    const re = new RegExp('\\|' + fieldName + '\\s*=([^|}]*)');
    const found = text.match(re);
    if (found) {
        const value = found[1].trim();
        if (value !== 'unfound') {
            return value;
        }
    }
};

/**
 *
 */
const parseNumber = (value) => {
    if (value !== undefined) {
        return Number(value);
    }
};

/**
 *
 */
const getUpgrades = (text) => {
    const upgrades = [];
    for (let i = 1; i <= 10; i++) {
        const field = getField(text, 'upgrade' + i);
        if (field) {
            upgrades.push(field);
        }
    }
    return upgrades.length ? upgrades.sort().join(',') : undefined;
};

/**
 *
 */
const cleanFlavour = (flavour) => {
    if (!flavour) {
        return;
    }
    flavour = flavour.replace(/^['’\s]+/m, '');
    flavour = flavour.replace(/['’\s]+$/m, '');
    return flavour;
};

/**
 *
 */
const cleanKeywords = (keywords) => {
    if (!keywords) {
        return;
    }
    keywords = keywords.split('[[').join('');
    keywords = keywords.split(']]').join('');
    keywords = keywords.split(', ').join('');
    return keywords.split(',').sort().join(',');
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = importCards;
