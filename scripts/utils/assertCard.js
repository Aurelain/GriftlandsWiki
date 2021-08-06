const assert = require('assert');
/**
 *
 */
const assertCard = (assertion, card, message) => {
    assert(assertion, `${JSON.stringify(card, null, 4)}\n${message}`);
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = assertCard;
