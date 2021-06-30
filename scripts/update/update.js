const AdmZip = require('adm-zip');

const attemptSelfRun = require('../utils/attemptSelfRun');
const getCharacters = require('./getCharacters');
const guard = require('../utils/guard');
const inspectCharacters = require('./inspectCharacters');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * Installation directory, which should contain the game archives ("data_scripts.zip" and others).
 */
const GAME_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/Griftlands';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const update = async () => {
    const zip = new AdmZip(GAME_DIR + '/data_scripts.zip');
    const characters = getCharacters(zip);
    const charactersStatus = inspectCharacters(characters);
    if (!(await guard(charactersStatus, true))) {
        return;
    }
    console.log('TODO');
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = update;
attemptSelfRun(update);
