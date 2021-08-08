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
const getArtIds = require('./getArtIds');
const importCardPics = require('./cardHelpers/importCardPics');
const {STORAGE, GAME_DIR, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const update = async () => {
    try {
        const assetsZip = new AdmZip(GAME_DIR + '/data.zip', {});
        const scriptsZip = new AdmZip(GAME_DIR + '/data_scripts.zip', {});

        const artIds = getArtIds(assetsZip);

        const keywords = getKeywords(scriptsZip);
        await writeKeywordsSheet(keywords);

        const cards = getCards(scriptsZip, keywords, artIds);
        await writeCardsSheet(cards);

        // importCardPics(cards);

        updateCards(cards);

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
