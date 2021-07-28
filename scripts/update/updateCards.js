const assert = require('assert');
const fs = require('fs');
const getFilePath = require('../utils/getFilePath');
const tally = require('../utils/tally');
const {STORAGE} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const updateCards = (cardsBag) => {
    let count = 0;
    for (const id in cardsBag) {
        const card = cardsBag[id];
        // console.log('card:', card);
        const filePath = STORAGE + '/' + getFilePath(card.name, '');
        if (!fs.existsSync(filePath)) continue;
        const existingWikitext = (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8')) || '';
        const existingCard = parseCardFromWikitext(existingWikitext);
        const futureCard = {...card, ...existingCard};
        const futureCardWikitext = generateCardWikitext(futureCard);
        const futureWikitext = generateWikitext(existingWikitext, futureCardWikitext);
        // console.log('futureWikitext:', futureWikitext);
        if (futureWikitext !== existingWikitext) {
            fs.writeFileSync(filePath, futureWikitext);
            count++;
            if (count >= 10) {
                break;
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
const parseCardFromWikitext = (wikitext) => {
    const card = {};
    const upgrades = [];
    const summaries = {};
    const fieldsFound = wikitext.matchAll(/\|\s*(\w+)\s*=\s*([^}|]*)/g);
    for (const [, fieldName, fieldValue] of fieldsFound) {
        const value = fieldValue.trim();

        const upgradeNumber = (fieldName.match(/^upgrade(\d+)$/) || [])[1];
        if (upgradeNumber) {
            upgrades[upgradeNumber] = value;
            continue;
        }

        const upgradeSummaryNumber = (fieldName.match(/^upgrade(\d+)summary$/) || [])[1];
        if (upgradeSummaryNumber) {
            const upgradeName = upgrades[upgradeSummaryNumber];
            assert(upgradeName, 'Expecting upgrade name!');
            if (value) {
                summaries[upgradeName] = value;
            }
            continue;
        }

        // TODO remove these when we have them in getCards.
        if (fieldName === 'character') {
            card.character = value;
        } else if (fieldName === 'cardtype') {
            card.cardType = value;
        }
    }
    if (tally(summaries)) {
        card.summaries = summaries;
    }
    return card;
};

/**
 *
 */
const generateCardWikitext = (card) => {
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
        summaries,
    } = card;

    let draft = '{{CardPage\n';
    if (flavour) {
        draft += `|quote = ${flavour}\n`;
    }
    if (desc) {
        draft += `|description = ${desc.replace(/[\r\n]+/g, '<br/>')}\n`;
    }
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
            const upgradeName = list[i];
            assert(!summaries || summaries[upgradeName], `${name}: Expecting a summary value for "${upgradeName}"!`);
            draft += `|upgrade${i + 1} = ${upgradeName}\n`;
            draft += `|upgrade${i + 1}summary = ${summaries[upgradeName]}\n`;
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

/**
 *
 */
const generateWikitext = (existingWikitext, futureCardWikitext) => {
    let draft = existingWikitext;

    draft = draft.replace(/{{stub}}/i, '');

    if (draft.includes('{{Card')) {
        draft = draft.replace(/{{Card[\s\S]*?}}/, futureCardWikitext);
    } else {
        draft = draft.trimStart();
        if (draft) {
            draft = futureCardWikitext + '\n' + draft;
        } else {
            draft = futureCardWikitext;
        }
    }

    draft = draft.replace(/^\s+{{Card/, '{{Card');

    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateCards;
