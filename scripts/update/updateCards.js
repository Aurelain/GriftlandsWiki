const assert = require('assert');
const fs = require('fs');
const getFilePath = require('../utils/getFilePath');
const {STORAGE} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CONFLICTED_NAMES = {
    Burn: 'Burn_(card)',
    Resonance: 'Resonance_(card)',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const updateCards = (bag) => {
    let count = 0;
    for (const id in bag) {
        const card = bag[id];
        const fileName = getFilePath(card.name, '');
        if (!fs.existsSync(STORAGE + '/' + fileName)) {
            const wikitext = generateWikitext(card);
            fs.writeFileSync(STORAGE + '/' + fileName, wikitext);
            count++;
            if (count > 10) {
                return;
            }
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const generateWikitext = (card) => {
    const {
        flavour,
        desc,
        name,
        cost,
        character,
        rarity,
        deckType,
        cardType,
        keywords,
        xp,
        upgrades,
        parent,
        minDamage,
        maxDamage,
    } = card;
    let draft = '{{CardPage\n';
    if (flavour) {
        draft += `|quote = ${flavour}\n`;
    }
    if (desc) {
        draft += `|description = ${desc.replace(/[\r\n]+/g, '<br/>')}\n`;
    }
    // if (CONFLICTED_NAMES[name]) {
    //     draft += `|image = \n`;
    // }
    if (cost !== undefined) {
        draft += `|cost = ${cost}\n`;
    }
    if (character) {
        draft += `|character = ${character}\n`;
    }
    if (rarity) {
        draft += `|rarity = ${rarity}\n`;
    }
    if (deckType) {
        draft += `|decktype = ${deckType}\n`;
    }
    if (cardType) {
        draft += `|cardtype = ${cardType}\n`;
    }
    if (keywords) {
        draft += `|keywords = [[${keywords.split(',').join(']], [[')}]]\n`;
    }
    if (xp !== undefined) {
        draft += `|expreq = ${xp}\n`;
    }
    if (upgrades) {
        const list = upgrades.split(',');
        for (let i = 0; i < list.length; i++) {
            draft += `|upgrade${i + 1} = ${list[i]}\n`;
            draft += `|upgrade${i + 1}summary = \n`;
        }
    }
    if (parent) {
        draft += `|parent = ${parent}\n`;
    }
    if (minDamage !== undefined) {
        draft += `|mindamage = ${minDamage}\n`;
    }
    if (maxDamage !== undefined) {
        draft += `|maxdamage = ${maxDamage}\n`;
    }
    draft += '}}';
    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateCards;
