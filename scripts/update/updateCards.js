const assert = require('assert');
const fs = require('fs');
const getFilePath = require('../utils/getFilePath');
const tally = require('../utils/tally');
const summarizeCardUpgrade = require('./cardHelpers/summarizeCardUpgrade');
const debugCard = require('../utils/debugCard');
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
    const nameToCard = {};
    for (const id in cardsBag) {
        const card = cardsBag[id];
        nameToCard[card.name] = card;
    }

    let count = 0;
    for (const id in cardsBag) {
        const card = cardsBag[id];
        const {name} = card;
        const filePath = STORAGE + '/' + getFilePath(name, '');
        // if (fs.existsSync(filePath)) continue;

        const existingWikitext = (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8')) || '';
        // if (existingWikitext.match(/{{Card/)) {
        //     continue;
        // }
        if (!existingWikitext.match(/{{Card\b/)) {
            continue;
        }
        // if (!existingWikitext.match(/{{CardPage\b/)) {
        //     continue;
        // }
        // if (id !== 'ammo_pouch') {
        //     continue;
        // }

        const existingCard = parseCardFromWikitext(existingWikitext);
        const futureCard = {...card, ...existingCard};
        generateUpgradeSummaries(futureCard, nameToCard);
        const futureCardWikitext = generateCardWikitext(futureCard);
        const futureWikitext = generateWikitext(existingWikitext, futureCardWikitext);
        // console.log('futureWikitext:', futureWikitext);
        if (futureWikitext !== existingWikitext) {
            // console.log('futureWikitext:', futureWikitext);
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
    const specials = [];
    const summaries = {};
    wikitext = wikitext.replace(/^\s*\|/gm, '#'); // so we can better protect cases like [[Improvise|Improvised]]
    const fieldsFound = wikitext.matchAll(/#\s*(\w+)\s*=\s*([^}#]*)/g);
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
        }

        if (fieldName.match(/^special(\d+)/)) {
            specials.push(value);
        }
        if (fieldName === 'generator') {
            card.generator = value;
        }
    }
    if (tally(summaries)) {
        card.summaries = summaries;
    }
    if (specials.length) {
        card.specials = specials.join(','); // TODO: remove when we have specials
    }
    return card;
};

/**
 *
 */
const generateUpgradeSummaries = (card, nameToCard) => {
    const {upgrades} = card;
    if (!upgrades) {
        return;
    }
    const upgradeNames = upgrades.split(',');
    const summaries = [];
    for (const upgradeName of upgradeNames) {
        const upgradeCard = nameToCard[upgradeName];
        debugCard(upgradeCard, card, 'Cannot find upgrade name!');
        summaries[upgradeName] = summarizeCardUpgrade(card, upgradeCard);
    }
    card.summaries = summaries;
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
        series,
        rarity,
        deckType,
        cardType,
        keywords,
        computedXp,
        upgrades,
        parent,
        specials,
        generator,
        minDamage,
        maxDamage,
        summaries,
    } = card;

    let draft = '{{CardPage\n';
    if (name.includes('(')) {
        const cleanName = name.replace(/ \(.*/, '');
        draft += `|name = ${cleanName}\n`;
        draft += `|image = ${cleanName}.png\n`;
    }

    if (flavour) {
        draft += `|quote = ${flavour}\n`;
    }
    if (desc) {
        draft += `|description = ${desc.replace(/[\r\n]+/g, '<br/>')}\n`;
    }
    if (cost !== undefined) {
        draft += `|cost = ${cost}\n`;
    }
    if (series) {
        draft += `|character = ${series}\n`;
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
    if (computedXp !== undefined) {
        draft += `|expreq = ${computedXp}\n`;
    }
    if (upgrades) {
        const list = upgrades.split(',');
        for (let i = 0; i < list.length; i++) {
            const upgradeName = list[i];
            draft += `|upgrade${i + 1} = ${upgradeName}\n`;
            const summary = (summaries && summaries[upgradeName]) || '';
            draft += `|upgrade${i + 1}summary = ${summary}\n`;
        }
    }
    if (parent) {
        draft += `|parent = ${parent}\n`;
    }
    if (specials) {
        const list = specials.split(',');
        for (let i = 0; i < list.length; i++) {
            draft += `|special${i + 1} = ${list[i]}\n`;
        }
    }
    if (generator) {
        draft += `|generator = ${generator}\n`;
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
