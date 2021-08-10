const assert = require('assert');
const fs = require('fs');
const getFilePath = require('../utils/getFilePath');
const assertCard = require('../utils/assertCard');
const {STORAGE} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const RACE_WORDS = {
    KRADESHI: "Kra'deshi",
    HUMAN: 'Human',
    JARACKLE: 'Jarackle',
    SHROKE: 'Shroke',
    PHICKET: 'Phicket',
    MECH: 'Mech',
};

const FACTION_WORDS = {
    ADMIRALTY: 'admiralty',
    BANDITS: 'spree',
    BILEBROKERS: 'bilebroker',
    BOGGERS: 'boggers',
    CULT_OF_HESH: 'cult of hesh',
    DELTREAN: 'deltreans',
    FEUD_CITIZEN: 'civilian',
    GRIFTER: 'grifters',
    JAKES: 'jakes',
    RENTORIAN: 'rentorians',
    RISE: 'rise',
    SPARK_BARONS: 'spark barons',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const updateCharacters = (characters, grafts, cards) => {
    let count = 0;
    for (const id in characters) {
        const character = characters[id];
        const {name} = character;
        const filePath = STORAGE + '/' + getFilePath(name, '');
        assertCard(fs.existsSync(filePath), character, 'Character does not exist in wiki!');

        const existingWikitext = (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8')) || '';
        // assertCard(existingWikitext.match(/{{CardPage\b/), card, `Wiki page is not a CardPage!\n${existingWikitext}`);
        if (!existingWikitext.match(/{{Character\b/)) {
            continue;
        }
        // if (!existingWikitext.match(/{{CardPage\b/)) {
        //     continue;
        // }
        // if (id !== 'ammo_pouch') {
        //     continue;
        // }
        const existingCharacter = parseCharacterFromWikitext(existingWikitext);
        const futureCharacter = {...character, ...existingCharacter};
        const futureCharacterWikitext = generateCharacterWikitext(futureCharacter);
        const futureWikitext = generateWikitext(existingWikitext, futureCharacterWikitext);
        if (futureWikitext !== existingWikitext) {
            // console.log('futureWikitext:', futureWikitext);
            fs.writeFileSync(filePath, futureWikitext);
            count++;
            if (count >= 10) {
                break;
            }
        }
    }
    // console.log('count:', count);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const parseCharacterFromWikitext = (wikitext) => {
    const character = {};
    wikitext = wikitext.replace(/^\s*\|/gm, '#');
    const fieldsFound = wikitext.matchAll(/#\s*(\w+)\s*=\s*([^}#]*)/g);
    for (const [, fieldName, fieldValue] of fieldsFound) {
        const value = fieldValue.trim();
        if (fieldName === 'location') {
            character.location = value;
        }
    }
    return character;
};
/**
 *
 */
const generateCharacterWikitext = (character) => {
    const {bio, species, location, faction_id, title, loved_graft, hated_graft} = character;

    let draft = '{{CharacterPage\n';
    // if (name.includes(':')) {
    //     draft += `|image = ${name.split(':').join('')}.png\n`;
    // }

    if (bio) {
        draft += `|quote = ${bio}\n`;
    }
    if (species) {
        assertCard(species in RACE_WORDS, character, 'Unrecognized species!');
        draft += `|race = ${RACE_WORDS[species]}\n`;
    }
    if (location) {
        draft += `|location = ${location}\n`;
    }
    if (faction_id) {
        assertCard(faction_id in FACTION_WORDS, character, 'Unrecognized faction!');
        draft += `|faction = ${FACTION_WORDS[faction_id]}\n`;
    }
    if (title) {
        draft += `|title = ${title}\n`;
    }
    if (loved_graft) {
        assertCard(hated_graft, character, 'Asymmetric graft!');
    }

    draft += '}}';
    return draft;
};

/**
 *
 */
const generateWikitext = (existingWikitext, futureCardWikitext) => {
    let draft = existingWikitext;

    draft = draft.replace(/{{stub}}/i, '');
    draft = draft.replace(/{{Reupload.*?}}/i, '');

    draft = draft.replace(/{{Character[\s\S]*?}}/, futureCardWikitext);

    draft = draft.replace(/^\s+{{Character/, '{{Character');

    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateCharacters;
