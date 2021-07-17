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

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = findEnclosure;
