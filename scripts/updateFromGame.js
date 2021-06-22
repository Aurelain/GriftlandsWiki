const fs = require('fs');
const crypto = require('crypto');
const fsExtra = require('fs-extra');
const AdmZip = require('adm-zip');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * Installation directory, which should contain the game archives ("data_scripts.zip" and others).
 */
const GAME_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/Griftlands';

const SKINS = 'scripts/content/characters/character_skins.lua';
const CHARACTERS = 'scripts/content/characters/';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const updateFromGame = async () => {
    const zip = new AdmZip(GAME_DIR + '/data_scripts.zip');
    const {people, bosses} = getCharacters(zip);
    console.log('people:', tally(people));
    console.log('bosses:', tally(bosses));
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getCharacters = (zip) => {
    const skins = parseCharacterSkins(zip);
    const defs = parseCharacterDefs(zip);
    return {
        people: getPeople(defs, skins),
        bosses: getBosses(defs, skins),
    };
};

/**
 *
 */
const parseCharacterSkins = (zip) => {
    const lua = zip.getEntry(SKINS).getData().toString('utf8');
    let draft = lua.replace(/[^{]*/, '');
    draft = draft.replace(/^(\s*)(\w+) =/gm, '$1"$2":');
    draft = draft.replace(/{\s+{/g, '[{');
    draft = draft.replace(/}\s+}/g, '}]');
    return JSON.parse(draft);
};

/**
 *
 */
const parseCharacterDefs = (zip) => {
    const entries = zip.getEntries();
    const output = {};
    for (const entry of entries) {
        if (entry.entryName.startsWith(CHARACTERS)) {
            const lua = entry.getData().toString('utf8');
            const definitions = collectDefinitionsFromLua(lua);
            Object.assign(output, definitions);
        }
    }
    return output;
};

/**
 *
 */
const collectDefinitionsFromLua = (lua) => {
    let cursor = 0;
    const output = {};
    while (true) {
        const index = lua.indexOf('CharacterDef("', cursor);
        if (index < 0) {
            break;
        }
        const enclosure = findEnclosure(lua, index, '(', ')');
        const definition = parseDefinition(enclosure);
        if (definition) {
            output[definition.id] = definition;
        }
        cursor = index + enclosure.length + 1;
    }
    return output;
};

/**
 *
 */
const findEnclosure = (text, from, begin, end) => {
    let indent = -1;
    for (let i = from; i < text.length; i++) {
        const c = text.charAt(i);
        switch (c) {
            case begin:
                indent++;
                break;
            case end:
                indent--;
                if (indent === -1) {
                    return text.substring(from, i + 1);
                }
                break;
            default:
            // nothing
        }
    }
    return '';
};

/**
 *
 */
const parseDefinition = (text) => {
    const id = text.match(/"([^"]+)/)[1];
    text = text.replace(/^\s*--.*/gm, '');
    return {
        id,
        name: capture(text, /name = "([^"]*)"/),
        base_def: capture(text, /base_def = "([^"]*)"/),
        faction_id: capture(text, /faction_id = "([^"]*)"/),
        loved_graft: capture(text, /loved_graft = "([^"]*)"/),
        hated_graft: capture(text, /hated_graft = "([^"]*)"/),
        death_item: capture(text, /death_item = "([^"]*)"/),
        unique: text.includes('unique = true'),
        boss: text.includes('boss = true'),
        hide_in_compendium: text.includes('hide_in_compendium = true'),
    };
};

/**
 *
 */
const parseDefinition2 = (text) => {
    const id = text.match(/"([^"]+)/)[1];
    console.log('id:', id);
    text = text.replace(/--.*/g, '');
    text = removeProp(text, 'negotiation_data');
    text = removeProp(text, 'fight_data');
    text = removeProp(text, 'anims');
    text = removeProp(text, 'combat_anims');
    text = removeProp(text, 'tags');
    text = text.replace(/= ([\w.]+),/g, '= "$1",');
    text = text.replace(/\[(.*?)]/g, '$1');
    text = text.replace(/([a-zA-Z_.]+)\s*=/g, '"$1":');
    // text = text.replace(/,[\s,]+/g, ',\n'); // fix commas after removed props
    text = text.replace(/,\s*}/g, '}'); // fix last comma in objects
    text = text.replace(/[^{]*/, ''); // trim beginning
    text = text.replace(/[^}]*$/, ''); // trim ending
    // text = convertToLuaObjectToArray(text, '"tags"');
    // text = text.replace(/[^{]*{/, '');
    // text = text.replace(/negotiation_data[\s\S]*/, '');
    // text = text.replace(/fight_data[\s\S]*/, '');
    // text = text.replace(/.*\(.*/g, '');
    // text = text.replace(/,\s*}/g, '}');
    //
    // text = text.replace(/{/g, '[');
    // text = text.replace(/}/g, ']');
    // text = '{' + text.replace(/[^"]*$/, '}');
    // console.log('text:', text);
    console.log('text:', text);
    const json = JSON.parse(text);
    return {
        id,
        name: capture(text, /name = "([^"]*)"/),
        base_def: capture(text, /base_def = "([^"]*)"/),
        faction_id: capture(text, /faction_id = "([^"]*)"/),
        loved_graft: capture(text, /loved_graft = "([^"]*)"/),
        hated_graft: capture(text, /hated_graft = "([^"]*)"/),
        death_item: capture(text, /death_item = "([^"]*)"/),
        unique: text.includes('unique = true'),
        boss: text.includes('boss = true'),
        hide_in_compendium: text.includes('hide_in_compendium = true'),
    };
};

/**
 * Shameless translation of `UpdateCount()` from `scripts/ui/widgets/peoplecompendium.lua`
 */
const getPeople = (defs, skins) => {
    const people = [];
    for (const contentId in defs) {
        const def = defs[contentId];
        if (def.boss) {
            // skip, these go in the boss tab.
        } else if (def.faction_id === 'PLAYER_FACTION') {
            // skip player defs.
        } else if (def.hide_in_compendium) {
            // explicitly skipped.
        } else {
            const relevantSkins = skins[contentId];
            if (relevantSkins) {
                for (const skin of relevantSkins) {
                    const agent = getAgent(def, skin);
                    people.push(agent);
                }
            } else if (def.unique) {
                const agent = getAgent(def);
                people.push(agent);
            }
        }
    }
    return people;
};

/**
 * Adaptation of `UpdateCount()` from `scripts/ui/widgets/bosscompendium.lua`
 */
const getBosses = (allDefs, allSkins) => {
    const bosses = [];
    for (const contentId in allDefs) {
        const def = allDefs[contentId];
        if (def.boss && !def.hide_in_compendium) {
            const skins = allSkins[contentId];
            if (skins) {
                for (const skin of skins) {
                    const agent = getAgent(def, skin);
                    bosses.push(agent);
                }
            } else {
                const agent = getAgent(def);
                bosses.push(agent);
            }
        }
    }
    return bosses;
};

/**
 *
 */
const getAgent = (def, skin) => {
    return {...def, ...skin};
};

/**
 *
 */
const capture = (text, pattern) => {
    return (text.match(pattern) || [0, ''])[1];
};

/**
 *
 */
const removeProp = (text, prop) => {
    const index = text.indexOf(prop);
    if (index >= 0) {
        const enclosure = findEnclosure(text, index, '{', '}');
        return text.replace(enclosure, '');
    } else {
        return text;
    }
};

/**
 *
 */
const tally = (target) => {
    return Object.keys(target).length;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateFromGame;
