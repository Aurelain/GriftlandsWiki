const assert = require('assert');
/**
 *
 */
const debugCard = (...args) => {
    if (args.length === 3) {
        const [assertion, card, message] = args;
        assert(assertion, `${card}\n${message}`);
    } else {
        const [card, message] = args;
        console.log(`${card.id} (${card.name}):`, message);
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = debugCard;
