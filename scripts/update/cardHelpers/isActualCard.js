// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const ALWAYS_KEYWORD = {
    pickpocket: true, // verified it doesn't exist in the Compendium
    frisk: true, // the id of the card named "Frisk" is "admiralty_manipulate". This is a wiki-CONFLICT!
};
const ALWAYS_CARD = {
    gluey_antennae: true, // verified it exists in the Compendium. The keyword is actually "Glued".
    blinders: true, // verified it exists in the Compendium. The keyword "Blinders" is a battle condition.
    fixed: true, // verified it exists in the Compendium. The keyword "Fixed" is a CONFLICT!
    casings: true, // verified it exists in the Compendium. The keyword "Casings" is a battle condition.
    tempered: true, // verified it exists in the Compendium. The keyword "Tempered" is a battle condition.
    deception: true, // verified it exists in the Compendium. The keyword "Deception" is an argument.
    spines: true, // verified it exists in the Compendium. The keyword "Spines" is a battle condition.
    viciousness: true, // verified it exists in the Compendium. The keyword "Viciousness" is a battle condition.
    hemophage: true, // verified it exists in the Compendium. The keyword "Hemophage" is a battle condition.
    shatter: true, // verified it exists in the Compendium. The keyword "Shatter" is a battle condition.
    tracer: true, // verified it exists in the Compendium. The keyword "Tracer" is a CONFLICT!
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * We normally decide that an id represents a card by checking the existence of its art.
 * Whoever calls this function knows for a fact that this id indeed has an equivalent art.
 * However, there are 2 situations where this id is NOT in fact a card:
 * 1. when the id ALSO belongs to a keyword (e.g. "Burn") and its content indeed is that of a keyword
 * 2. when the id ONLY belongs to a keyword (e.g. "Pickpocket"), and is not in fact a real card
 */
const isActualCard = (id, content) => {
    if (id in ALWAYS_KEYWORD) {
        return false;
    }
    if (id in ALWAYS_CARD) {
        return true;
    }
    switch (id) {
        case 'drunk':
        case 'mettle':
        case 'burn':
            return content.includes('CARD_FLAGS');
        default:
            console.log(`${id}: Doubt as to whether this is a card or a keyword!`);
    }

    return true;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = isActualCard;
