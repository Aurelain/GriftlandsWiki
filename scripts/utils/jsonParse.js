/**
 * Returns a valid json or null.
 * Purpose: brevity.
 */
const jsonParse = (text) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        return null;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = jsonParse;
