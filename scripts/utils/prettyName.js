const {REPLACEMENTS} = require('./CONFIG');

/**
 *
 */
const prettyName = (fileName) => {
    let title = fileName;
    for (const unsafe in REPLACEMENTS) {
        const safe = REPLACEMENTS[unsafe];
        title = title.split(safe).join(unsafe);
    }
    return title;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = prettyName;
