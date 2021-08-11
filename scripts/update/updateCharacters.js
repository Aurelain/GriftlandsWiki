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
    ADMIRALTY: 'Admiralty',
    BANDITS: 'Spree',
    BILEBROKERS: 'Bilebroker',
    BOGGERS: 'Boggers',
    CULT_OF_HESH: 'Cult of Hesh',
    DELTREAN: 'Deltreans',
    FEUD_CITIZEN: 'Civilian',
    GRIFTER: 'Grifters',
    JAKES: 'Jakes',
    RENTORIAN: 'Rentorians',
    RISE: 'Rise',
    SPARK_BARONS: 'Spark Barons',
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
        const futureCharacterWikitext = generateCharacterWikitext(futureCharacter, grafts, cards);
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
const generateCharacterWikitext = (character, grafts, cards) => {
    const {bio, species, location, faction_id, title, loved_graft, hated_graft, death_item} = character;

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
        assertCard(loved_graft in grafts, character, 'Unknown loved_graft!');
        assertCard(hated_graft in grafts, character, 'Unknown hated_graft!');
        const boon = grafts[loved_graft];
        const bane = grafts[hated_graft];
        draft += `|boon = ${boon.name}\n`;
        draft += `|boonimage = ${boon.name.toLowerCase()}\n`;
        draft += `|boondesc = ${boon.desc}\n`;
        draft += `|bane = ${bane.name}\n`;
        draft += `|baneimage = ${bane.name.toLowerCase()}\n`;
        draft += `|banedesc = ${bane.desc}\n`;
    }
    if (death_item) {
        assertCard(death_item in cards, character, 'Unknown death_item!');
        const card = cards[death_item];
        draft += `|deathloot = ${card.name}\n`;
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
