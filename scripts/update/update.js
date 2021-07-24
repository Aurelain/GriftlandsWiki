const fs = require('fs');
const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
const importCards = require('./importCards');
const getCards = require('./getCards');
const getKeywords = require('./getKeywords');
const updateCards = require('./updateCards');
const getCharacters = require('./getCharacters');
const getFactions = require('./getFactions');
const guard = require('../utils/guard');
const prepareCharacters = require('./prepareCharacters');
const inspectCharacters = require('./inspectCharacters');
const writeCardsSheet = require('./writeCardsSheet');
const writeKeywordsSheet = require('./writeKeywordsSheet');
const writeCharactersSheet = require('./writeCharactersSheet');
const tally = require('../utils/tally');
const {STORAGE, GAME_DIR, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const update = async () => {
    try {
        const zip = new AdmZip(GAME_DIR + '/data_scripts.zip', {});
        const keywords = getKeywords(zip);
        await writeKeywordsSheet(keywords);

        const cards = getCards(zip, keywords);
        await writeCardsSheet(cards);
        // const importedCards = importCards(zip);
        // compareCards(cards, importedCards);

        // const finalCards = mergeCards(cards, importedCards);
        // updateCards(finalCards);

        // await writeCardsSheet(importedCards, 'importedCards');

        return;

        const characters = await getCharacters(zip);
        const factions = getFactions(zip);
        const prepared = prepareCharacters(characters, factions);
        const charactersStatus = inspectCharacters(prepared);
        if (!(await guard(charactersStatus, true))) {
            return;
        }
        await writeCharactersSheet(characters);
        writeCharacters(prepared);
    } catch (e) {
        console.log('Error:', e.message);
        DEBUG && console.log(e.stack);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const writeCharacters = (prepared) => {
    for (const filePath in prepared) {
        const {content} = prepared[filePath];
        const fullPath = STORAGE + '/' + filePath;
        fs.writeFileSync(fullPath, content);
    }
};

/**
 *
 */
const compareCards = (cards, importedCards) => {
    const cardsByName = {};
    for (const id in cards) {
        const card = cards[id];
        cardsByName[card.name] = card;
    }
    for (const id in importedCards) {
        const {name} = importedCards[id];
        const gameCard = cardsByName[name];
        if (!gameCard) {
            console.log('Missing!', name);
            continue;
        }
        const importedCard = importedCards[id];
        if (gameCard.upgrades !== importedCard.upgrades) {
            console.log('Different upgrades!', name);
        }
        if (gameCard.xp !== importedCard.xp) {
            // console.log('Different xp!', name);
        }
        if (gameCard.cost !== importedCard.cost) {
            // console.log('Different cost!', name, '=', gameCard.cost, '=', importedCard.cost);
        }
        if (gameCard.rarity !== importedCard.rarity) {
            // console.log('Different rarity!', name, '=', gameCard.rarity, '=', importedCard.rarity);
        }
        if (gameCard.flavour !== importedCard.flavour) {
            // console.log('Different flavour!', name, '=', gameCard.flavour, '=', importedCard.flavour);
        }
        if (gameCard.keywords !== importedCard.keywords) {
            // console.log('Different keywords!', name, '=', gameCard.keywords, '=', importedCard.keywords);
        }
    }
};
/**
 *
 */
const mergeCards = (cards, importedCards) => {
    const mergedCards = {};
    const cardsByName = {};
    for (const id in cards) {
        const card = cards[id];
        cardsByName[card.name] = card;
    }
    for (const id in importedCards) {
        const importedCard = importedCards[id];
        const gameCard = cardsByName[importedCard.name];
        mergedCards[id] = {
            name: importedCard.name,
            id: gameCard.id,
            desc: importedCard.desc, // mystischism
            character: importedCard.character, // mystischism
            deckType: importedCard.deckType, // mystischism
            cardType: importedCard.cardType, // mystischism
            keywords: importedCard.keywords, // mystischism
            flavour: gameCard.flavour,
            rarity: gameCard.rarity,
            parent: gameCard.parent,
            upgrades: gameCard.upgrades,
            cost: gameCard.cost,
            xp: importedCard.xp, // mystischism
            minDamage: gameCard.minDamage,
            maxDamage: gameCard.maxDamage,
        };
    }
    return mergedCards;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = update;
attemptSelfRun(update);
