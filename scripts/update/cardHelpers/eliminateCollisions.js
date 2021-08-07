const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * The following card ids share the same *name* with a keyword (mostly collisions with a Condition name).
 * Their name will be prefixed with " (card)" or will be left intact.
 */
const CARD_KEYWORD_COLLISIONS = {
    status_bleed: 'BLEED',
    charged_disc: 'oolo_charged_disc',
    blinders: 'blinders',
    fixed: 'fixed',
    casings: 'casings',
    tempered: 'tempered',
    deception: 'DECEPTION',
    spines: 'spines',
    viciousness: 'viciousness',
    hemophage: 'HEMOPHAGE',
    resonance: 'RESONATED',
    shatter: 'SHATTER',
    tracer: 'tracer',
    admiralty_manipulate: 'frisk',
    burn: 'BURN',
    coin_heads: 'HEADS',
    coin_snails: 'SNAILS',
    slick: 'subtle_setup',
    discord: 'chaos_theory',
    flead_larvae_card: 'tiny_stinger',
    hologram_projection_belt: 'kashio_hologram_belt',
    suitcase_grenades: 'kashio_suitcase_grenades',
    // choose_hostile: 'HOSTILITY', // Denied
};

/**
 * These collisions will NOT have their name suffixed with " (card)".
 * The reasoning is that the conflict is harmless, as the wiki won't need these pages as keywords.
 */
const ALLOWED_COLLISIONS = {
    blinders: true,
    casings: true,
    discord: true,
    charged_disc: true,
    deception: true,
    hemophage: true,
    shatter: true,
    spines: true,
    slick: true,
    tempered: true,
    viciousness: true,
    flead_larvae_card: true,
    hologram_projection_belt: true,
    suitcase_grenades: true,
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const eliminateCollisions = (cardsBag, keywords) => {
    for (const cardId in CARD_KEYWORD_COLLISIONS) {
        const keywordId = CARD_KEYWORD_COLLISIONS[cardId];
        assert(cardsBag[cardId], `Missing card for collision! "${cardId}"`);
        assert(keywords[keywordId], `Missing keyword for collision! "${keywordId}"`);
        assert(cardsBag[cardId].name === keywords[keywordId].name, `Expected collision did not happen! "${cardId}`);
        if (!(cardId in ALLOWED_COLLISIONS)) {
            cardsBag[cardId].name += ' (card)';
        }
    }

    const barrage_plus2 = cardsBag['barrage_plus2'];
    const charged_barrage_plus2 = cardsBag['charged_barrage_plus2'];
    assert(barrage_plus2 && charged_barrage_plus2, 'A barrage is missing!');
    assert(barrage_plus2.name === charged_barrage_plus2.name, 'Expected barrage collision!');
    barrage_plus2.name += ' (negotiation card)';

    checkDuplicateNames(cardsBag, keywords);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const checkDuplicateNames = (cardsBag, keywords) => {
    const keywordNames = {};
    for (const keyword in keywords) {
        const {id, name} = keywords[keyword];
        keywordNames[name] = id;
    }
    const names = {};
    for (const id in cardsBag) {
        const {name} = cardsBag[id];
        if (names[name]) {
            console.log(`${id}: Name collision with id "${names[name]}" for "${name}"!`);
        } else {
            names[name] = id;
        }
        if (keywordNames[name] && !ALLOWED_COLLISIONS[id]) {
            console.log(`${id}: Name collision with keyword "${keywordNames[name]}" for "${name}"!`);
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = eliminateCollisions;
