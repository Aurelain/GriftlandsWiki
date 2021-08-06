const {REPLACEMENTS} = require('./CONFIG');

/**
 * Converts a wiki title into a filesystem name, including a custom extension.
 */
const getFilePath = (title, content) => {
    const ext = typeof content === 'string' ? 'wikitext' : 'json';
    const dir = (title.match(/^([^:]+):[^ _]/) || [null, ''])[1]; // Watch-out for "Weakness: Blind Spot"
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
