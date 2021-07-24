const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
const extractPortraits = require('./extractPortraits');
const extractCardArt = require('./extractCardArt');
const {GAME_DIR, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const datamine = async () => {
    try {
        const dataZip = new AdmZip(GAME_DIR + '/data.zip');
        const scriptsZip = new AdmZip(GAME_DIR + '/data_scripts.zip');
        // await extractPortraits(dataZip, scriptsZip);
        await extractCardArt(dataZip, scriptsZip);
    } catch (e) {
        console.log(DEBUG ? e.stack : `Error: ${e.message}`);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = datamine;
attemptSelfRun(datamine);
