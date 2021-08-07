const getFilePath = require('../../utils/getFilePath');
const fs = require('fs');
const {STORAGE} = require('../../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const PENDING_DELETION = {
    'Blinders.wikitext': true,
    'Cancel.wikitext': true,
    'Casings.wikitext': true,
    'Chaos_Theory.wikitext': true,
    'Charged_Disc.wikitext': true,
    'Deception.wikitext': true,
    'Fixed.wikitext': true,
    'Friendly_Support.wikitext': true,
    'Heads.wikitext': true,
    'Hemophage.wikitext': true,
    'Improved_Accuracy.wikitext': true,
    'Shatter.wikitext': true,
    'Snails.wikitext': true,
    'Spines.wikitext': true,
    'Subtle_Setup.wikitext': true,
    'Tempered.wikitext': true,
    'Viciousness.wikitext': true,
    'Warp_Vial.wikitext.wikitext': true,
};

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
        if (file in PENDING_DELETION) {
            continue; // we already know it's useless
        }
        const joinedPath = STORAGE + '/' + file;
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            // Nothing, don't enter directories
        } else {
            const content = fs.readFileSync(joinedPath, 'utf8');
            if (content.match(/{{Card\b|{{CardPage\b/)) {
                !(file in validFilePaths) && console.log(`Useless wiki card! ${file}`);
                // assert(file in validFilePaths, `Useless wiki card!\n${file}\n${content}`);
            }
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = ensureUsefulWikiCards;
