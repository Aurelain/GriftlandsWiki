const fs = require('fs');
const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
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
        // console.log('cards: ' + JSON.stringify(cards, null, 4));
        await writeCardsSheet(cards);
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

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = update;
attemptSelfRun(update);
