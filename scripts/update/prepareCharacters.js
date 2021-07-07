const fs = require('fs');
const assert = require('assert');

const getFilePath = require('../utils/getFilePath');
const {STORAGE} = require('../utils/CONFIG');

const RACE_WORDS = {
    KRADESHI: "Kra'deshi",
    HUMAN: 'Human',
    JARACKLE: 'Jarackle',
    SHROKE: 'Shroke',
    PHICKET: 'Phicket',
    MECH: 'Mech',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *     'Threekwa.wikitext': {
 *         title: 'Threekwa',
 *         content: '...',
 *     },
 *     ...
 * }
 */
const prepareCharacters = ({people, bosses}, factions) => {
    console.log('Preparing characters...');
    const all = [...people, ...bosses];
    const bag = {};
    for (const character of all) {
        const {name} = character;
        const filePath = getFilePath(name, '');
        const fullPath = STORAGE + '/' + filePath;
        let content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
        content = updateInfobox(content, character, factions);
        bag[filePath] = {
            title: name,
            content,
        };
    }
    return bag;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const updateInfobox = (content, character, factions) => {
    const {species, faction_id, title} = character;

    const hasStub = content.startsWith('{{stub}}') || !content;
    content = content.replace(/^{{stub}}\s*/, ''); // remove starting stub, as we'll add it later

    const location = (content.match(/\|\s*location\s*=\s*(\w[^\n|}]*)/) || [null, ''])[1];
    const faction2 = (content.match(/\|\s*faction2\s*=\s*(\w[^\n|}]*)/) || [null, ''])[1];
    content = content.replace(/{{Character[\s\S]*?}}\s*/, ''); // remove Character, as we'll add it later
    content = content.replace(/{{Infobox[\s\S]*?}}\s*/, ''); // remove Infobox, as we'll add it later

    content = content.trim();

    let infobox = '';
    infobox += '{{Character\n';

    // infobox += `| name     = ${name}\n`;

    // infobox += `| image    = ${name}.png\n`;

    const race = getRace(species);
    if (race) {
        infobox += `| race = ${race}\n`;
    }

    infobox += `| location = ${location}\n`;

    if (faction_id && !faction_id.startsWith('NEUTRAL') && faction_id !== 'MONSTER_FACTION') {
        assert(factions[faction_id], 'Unknown faction!' + JSON.stringify(character, null, 4));
        infobox += `| faction = ${factions[faction_id]}\n`;
    }

    if (faction2 && faction2 !== title) {
        infobox += `| faction2 = ${faction2}\n`;
    }

    if (title) {
        infobox += `| title = ${title}\n`;
    }

    infobox += `}}\n`;

    const stubPrefix = hasStub ? '{{stub}}\n\n' : '';
    content = stubPrefix + infobox + '\n' + content;

    // if (name === 'Threekwa') {
    //     console.log('character: ' + JSON.stringify(character, null, 4));
    //     console.log('content:', content);
    // }
    return content.trim();
};

/**
 *
 */
const getRace = (species) => {
    if (!species) {
        return;
    }
    const race = RACE_WORDS[species];
    assert(race, 'Unknown race!' + species);
    return race;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = prepareCharacters;
