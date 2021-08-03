const fs = require('fs');
const {STORAGE} = require('./CONFIG');

/**
 *
 */
const getLocalContent = (filter) => {
    const bag = {};
    const localFiles = walk(STORAGE, '', filter);
    for (const localFile of localFiles) {
        bag[localFile] = fs.readFileSync(STORAGE + '/' + localFile, 'utf8');
    }
    return bag;
};

/**
 *
 */
const walk = (dir, prefix, filter, results = []) => {
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const joinedPath = dir + '/' + item;
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            walk(joinedPath, item + '/', filter, results);
        } else {
            if (!filter || joinedPath.match(filter)) {
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
