const fs = require('fs');
const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
const getCharacters = require('./getCharacters');
const getFactions = require('./getFactions');
const guard = require('../utils/guard');
const prepareCharacters = require('./prepareCharacters');
const inspectCharacters = require('./inspectCharacters');
const writeCharactersSheet = require('./writeCharactersSheet');
const {STORAGE, GAME_DIR} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const update = async () => {
    const zip = new AdmZip(GAME_DIR + '/data_scripts.zip', {});
    const characters = await getCharacters(zip);
    const factions = getFactions(zip);
    const prepared = prepareCharacters(characters, factions);
    const charactersStatus = inspectCharacters(prepared);
    await writeCharactersSheet(characters);
    if (!(await guard(charactersStatus, true))) {
        return;
    }
    writeCharacters(prepared);
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
