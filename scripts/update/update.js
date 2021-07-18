const fs = require('fs');
const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
const importCards = require('./importCards');
const getCards = require('./getCards');
const getCharacters = require('./getCharacters');
const getFactions = require('./getFactions');
const guard = require('../utils/guard');
const prepareCharacters = require('./prepareCharacters');
const inspectCharacters = require('./inspectCharacters');
const writeCardsSheet = require('./writeCardsSheet');
const writeCharactersSheet = require('./writeCharactersSheet');
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
        const cards = getCards(zip);
        // await writeCardsSheet(cards, 'cards');

        const importedCards = importCards(zip);
        // await writeCardsSheet(importedCards, 'importedCards');

        compareCards(cards, importedCards);
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
        if (!cardsByName[name]) {
            console.log('Missing!', name);
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = update;
attemptSelfRun(update);
