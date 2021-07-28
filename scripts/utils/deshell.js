/**
 *
 */
const deshell = (textWithBrackets) => {
    return textWithBrackets.substring(textWithBrackets.indexOf('{') + 1, textWithBrackets.lastIndexOf('}'));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = deshell;
