// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const ONLY_KEYWORD = {
    pickpocket: true, // verified it doesn't exist in the Compendium
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
    if (id in ONLY_KEYWORD) {
        return false;
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
