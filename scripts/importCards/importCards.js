const fs = require('fs');
const attemptSelfRun = require('../utils/attemptSelfRun');
const guard = require('../utils/guard');
const {STORAGE} = require('../utils/CONFIG');
const {GAME_DIR, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CARDS_DIR = 'D:/wikitextFiles';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const importCards = async () => {
    try {
        const status = scanDir(CARDS_DIR);
        if (!(await guard(status, true))) {
            return;
        }
        console.log('TODO');
    } catch (e) {
        console.log(DEBUG ? e.stack : `Error: ${e.message}`);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const scanDir = (cardsDir) => {
    const list = fs.readdirSync(cardsDir);
    const different = {};
    const cloudOnly = {};
    for (const file of list) {
        const localPath = STORAGE + '/' + file;
        if (fs.existsSync(localPath)) {
            different[file] = {title: file, content: ''};
        } else {
            cloudOnly[file] = {title: file, content: ''};
        }
    }
    return {different, cloudOnly};
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = importCards;
attemptSelfRun(importCards);
