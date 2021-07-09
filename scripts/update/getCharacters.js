const tally = require('../utils/tally');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * For unknown reasons, the character "Murkot" appears in the actual Compendium, although it shouldn't do so according
 * to the code in lua (because he isn't mentioned in skins and isn't marked as unique).
 * So we make him unique ourselves...
 */
const MURKOT_EXCEPTION = 'HESH_OUTPOST_LUMINARI';

const SKINS = 'scripts/content/characters/character_skins.lua';
const CHARACTERS_DIR = 'scripts/content/characters/';

const REDIRECTS = {
    Fellemo: 'Lellyn Fellemo',
    Kalandra: 'Prindo Kalandra',
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *     people: [
 *         {
 *             id: 'CHEMIST',
 *             faction_id: 'BILEBROKERS',
 *             base_def: 'DREDGER_BASE',
 *             loved_graft: 'doze_bug',
 *             hated_graft: 'spiked_drink',
 *             death_item: 'vapor_vial',
 *             bio: "It's unclear whether Leesha's easygoing attitude is a result of her temperament,...",
 *             gender: 'FEMALE',
 *             hair_colour: 876105983,
 *             head: 'head_dredger_female',
 *             name: 'Leesha',
 *             skin_colour: 3516105471,
 *             species: 'HUMAN',
 *             traits: {},
 *             uuid: 'af48dcab-a73f-4e75-b6d0-ca80113c5a03'
 *         },
 *         ...
 *     ],
 *     bosses: [
 *          {
 *            id: 'VIXMALLI',
 *            faction_id: 'CULT_OF_HESH',
 *            base_def: 'PRIEST',
 *            death_item: 'heshian_amulet',
 *            loved_graft: 'bio_feedback',
 *            hated_graft: 'bad_faith',
 *            name: 'Vixmalli',
 *            boss: true,
 *            build: 'male_vixmali_build',
 *            content_id: 'VIXMALLI',
 *            gender: 'MALE',
 *            hair_colour: 876105983,
 *            head: 'head_male_vixmali',
 *            skin_colour: 3333903871,
 *            species: 'KRADESHI',
 *            uuid: '82334e02-a387-46f0-b63d-887b225f0fe5'
 *          },
 *          ...
 *     ]
 * }
 */
const getCharacters = async (zip) => {
    const skins = parseCharacterSkins(zip);
    const defs = parseCharacterDefs(zip);

    const people = getPeople(defs, skins);
    console.log('People:', tally(people));
    // prettyCharacters(people);

    const bosses = getBosses(defs, skins);
    console.log('Bosses:', tally(bosses));
    // prettyCharacters(bosses);

    return [...people, ...bosses];
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
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
            title: capture(text, /title = "([^"]*)"/),
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
    const output = {...def, ...skin};
    if (output.name in REDIRECTS) {
        output.name = REDIRECTS[output.name];
    }
    return output;
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
*/
// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getCharacters;
