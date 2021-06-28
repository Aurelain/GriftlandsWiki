const {REPLACEMENTS} = require('./CONFIG');

/**
 *
 */
const getFilePath = (title, content) => {
    const ext = typeof content === 'string' ? 'wikitext' : 'json';
    const dir = (title.match(/^([^:]+):/) || [null, ''])[1];
    const prefix = dir ? dir + '/' : '';
    let name = dir ? title.substr(dir.length + 1) : title;
    for (const c in REPLACEMENTS) {
        name = name.split(c).join(REPLACEMENTS[c]);
    }
    return prefix + name + '.' + ext;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getFilePath;
