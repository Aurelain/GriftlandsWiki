const fs = require('fs');
const {STORAGE} = require('./CONFIG');

/**
 *
 */
const getLocalContent = (regExpFilter) => {
    const bag = {};
    const localFiles = walk(STORAGE, '', regExpFilter);
    for (const localFile of localFiles) {
        bag[localFile] = fs.readFileSync(STORAGE + '/' + localFile, 'utf8');
    }
    return bag;
};

/**
 *
 */
const walk = (dir, prefix, regExpFilter, results = []) => {
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const joinedPath = dir + '/' + item;
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            walk(joinedPath, item + '/', regExpFilter, results);
        } else {
            if (!regExpFilter || joinedPath.match(regExpFilter)) {
                results.push(prefix + item);
            }
        }
    }
    return results;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getLocalContent;
