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
    const characters = collectCharacters(zip);
    console.log('characters:', Object.keys(characters).length);
    // for (const zipEntry of zipEntries) {
    //     console.log('zipEntry:', zipEntry.entryName);
    // }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const collectCharacters = (zip) => {
    const skins = collectCharacterSkins(zip);
    const definitions = collectCharacterDefinitions(zip);
    console.log('definitions:', definitions);
    const output = {};
    return output;
};

/**
 *
 */
const collectCharacterSkins = (zip) => {
    const lua = zip.getEntry(SKINS).getData().toString('utf8');
    let draft = lua.replace(/[^{]*/, '');
    draft = draft.replace(/^(\s*)(\w+) =/gm, '$1"$2":');
    draft = draft.replace(/{\s+{/g, '[{');
    draft = draft.replace(/}\s+}/g, '}]');
    const json = JSON.parse(draft);
    const output = {};
    for (const groupKey in json) {
        for (const {bio, name, id, species} of json[groupKey]) {
            output[name] = {
                bio,
                id,
                species,
            };
        }
    }
    return output;
};

/**
 *
 */
const collectCharacterDefinitions = (zip) => {
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
    // if (!lua.includes('"Mullifee"')) {
    //     return output;
    // }
    while (true) {
        const index = lua.indexOf('CharacterDef("', cursor);
        if (index < 0) {
            break;
        }
        const enclosure = findEnclosure(lua, index);
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
const findEnclosure = (text, from) => {
    let indent = -1;
    for (let i = from; i < text.length; i++) {
        const c = text.charAt(i);
        // console.log('c:', c, indent);
        switch (c) {
            case '(':
                indent++;
                break;
            case ')':
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
    // if (id !== 'MULLIFEE') {
    //     return;
    // }
    text = text.replace(/^\s*--.*/gm, '');
    return {
        id,
        base_def: (text.match(/base_def = "([^"]*)"/) || [0, ''])[1],
        boss: text.includes('boss = true'),
    };
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateFromGame;
