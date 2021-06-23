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

/**
 * For unknown reasons, the character "Murkot" appears in the actual Compendium, although it shouldn't do so according
 * to the code in lua (because he isn't mentioned in skins and isn't marked as unique).
 * So we make him unique ourselves...
 */
const MURKOT_EXCEPTION = 'HESH_OUTPOST_LUMINARI';

const SKINS = 'scripts/content/characters/character_skins.lua';
const CHARACTERS_DIR = 'scripts/content/characters/';

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
    // prettyCharacters(people);
    // prettyCharacters(bosses);
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
        if (entry.entryName.startsWith(CHARACTERS_DIR)) {
            const lua = entry.getData().toString('utf8');
            const definitions = collectDefinitionsFromLua(lua);
            Object.assign(output, definitions);
        }
    }
    for (const key in output) {
        const def = output[key];
        const {base_def} = def;
        if (base_def) {
            output[key] = {...output[base_def], ...def};
        }
    }
    output[MURKOT_EXCEPTION].unique = true;
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
    text = removeProp(text, 'negotiation_data');
    text = removeProp(text, 'fight_data');
    // Note: we're using the parse/stringify hack to remove undefined values
    return JSON.parse(
        JSON.stringify({
            id,
            name: capture(text, /name = "([^"]*)"/),
            base_def: capture(text, /base_def = "([^"]*)"/),
            faction_id: capture(text, /faction_id = "?(\w+)/),
            loved_graft: capture(text, /loved_graft = "([^"]*)"/),
            hated_graft: capture(text, /hated_graft = "([^"]*)"/),
            death_item: capture(text, /death_item = "([^"]*)"/),
            unique: capture(text, /unique = (true)/) ? true : undefined,
            boss: capture(text, /boss = (true)/) ? true : undefined,
            hide_in_compendium: capture(text, /hide_in_compendium = (true)/) ? true : undefined,
        })
    );
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
    return (text.match(pattern) || [])[1];
};

/**
 *
 */
const removeProp = (text, prop) => {
    const index = text.indexOf(prop);
    if (index >= 0) {
        const enclosure = findEnclosure(text, index, '{', '}');
        if (enclosure && enclosure.match(new RegExp(prop + '\\s*=\\s*{'))) {
            // sometimes the prop is a string, not an object, so `findEnclosure()` fails.
            text = text.replace(enclosure + ',', '');
            text = text.replace(enclosure, ''); // in case the previous line did not handle the comma
        }
    }
    return text;
};

/**
 *
 */
const tally = (target) => {
    return Object.keys(target).length;
};

/**
 *
 */
const prettyCharacters = (list) => {
    const sorted = list.slice().sort((a, b) => (a.name < b.name ? -1 : 1));
    const names = sorted.map((item) => item.name);
    let pretty = '';
    for (let i = 0; i < names.length; i++) {
        if (i % 4 === 0) {
            pretty += '\n';
        }
        if (i % 28 === 0) {
            pretty += '-'.repeat(120) + '\n';
        }
        pretty += (names[i] + ' '.repeat(32)).substring(0, 32);
    }
    console.log('output:', pretty);
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = updateFromGame;
