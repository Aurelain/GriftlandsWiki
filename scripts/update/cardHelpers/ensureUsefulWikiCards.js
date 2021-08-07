const getFilePath = require('../../utils/getFilePath');
const fs = require('fs');
const {STORAGE} = require('../../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const ensureUsefulWikiCards = (validCardsBag) => {
    const validFilePaths = {};
    for (const id in validCardsBag) {
        const card = validCardsBag[id];
        const filePath = getFilePath(card.name, '');
        validFilePaths[filePath] = true;
    }
    const list = fs.readdirSync(STORAGE);
    for (const file of list) {
        const joinedPath = STORAGE + '/' + file;
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            // Nothing, don't enter directories
        } else {
            const content = fs.readFileSync(joinedPath, 'utf8');
            if (content.match(/{{Card\b|{{CardPage\b/i)) {
                if (!(file in validFilePaths) && !content.match(/{{Delete\b/i)) {
                    console.log(`Useless wiki card! ${file}`);
                }
            }
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = ensureUsefulWikiCards;
