const fs = require('fs');
const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const DESCRIPTION_FIXES = {
    '<b>Thresholds</>': '[[Threshold|Thresholds]]',
    '<b>Expended</>': '[[Expend|Expended]]',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const addKeywords = (cardsBag, globalKeywords) => {
    const globalKeywordNames = {};
    for (const id in globalKeywords) {
        globalKeywordNames[globalKeywords[id].name] = true;
    }
    for (const id in cardsBag) {
        addKeywordsToCard(cardsBag[id], globalKeywordNames);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const addKeywordsToCard = (card, globalKeywordNames) => {
    const usedBag = {};
    const allKeywords = [];
    const linksFound = (card.desc || '').matchAll(/\[\[([^|\]]+)/g);
    for (const [, linkFound] of linksFound) {
        if (linkFound in globalKeywordNames && !(linkFound in usedBag)) {
            allKeywords.push(linkFound);
            usedBag[linkFound] = true;
        }
    }
    const internalKeywords = card.keywords ? card.keywords.split(',') : [];
    for (const internalKeyword of internalKeywords) {
        if (!(internalKeyword in usedBag)) {
            allKeywords.push(internalKeyword);
            usedBag[internalKeyword] = true;
        }
    }
    if (internalKeywords.length) {
        const wikiKeywords = '[[' + internalKeywords.join(']], [[') + ']]';
        const prefix = card.desc ? card.desc + '<br/>' : '';
        card.desc = prefix + wikiKeywords;
    }
    if (allKeywords.length) {
        card.keywords = allKeywords.join(',');
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = addKeywords;
