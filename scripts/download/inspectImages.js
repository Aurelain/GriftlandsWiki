const fs = require('fs');
const crypto = require('crypto');

const tally = require('../utils/tally');
const getFilePath = require('../utils/getFilePath');
const {STORAGE, RAW} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * In this case:
 * - `cloud` means `wiki/File`
 * - `local` means `raw/web`
 * {
 *     synchronized: {...},
 *     different: {...},
 *     cloudOnly: {...},
 *     localOnly: {...},
 * }
 */
const inspectImages = (focus) => {
    console.log('Inspecting images...');
    const focusFileName = focus ? getFilePath(focus, {}).replace('File/', '') : '';
    const synchronized = {};
    const different = {};
    const cloudOnly = {};
    const localOnly = {};
    const files = collectFiles(focusFileName);
    const raw = collectRaw(focusFileName);
    for (const fileName in files) {
        const fileContent = files[fileName];
        if (fileName in raw) {
            if (fileContent.sha1 === raw[fileName].sha1) {
                synchronized[fileName] = fileContent;
            } else {
                different[fileName] = fileContent;
            }
        } else {
            cloudOnly[fileName] = fileContent;
        }
    }
    for (const fileName in raw) {
        if (!(fileName in files)) {
            localOnly[fileName] = raw[fileName];
        }
    }
    const statusTally = {
        synchronized: tally(synchronized),
        different: tally(different),
        cloudOnly: tally(cloudOnly),
        localOnly: tally(localOnly),
    };
    console.log('Status tally:', JSON.stringify(statusTally, null, 4));
    return {synchronized, different, cloudOnly, localOnly};
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const collectFiles = (focus) => {
    const filesDir = STORAGE + '/File';
    const jsonNames = focus ? [focus] : fs.readdirSync(filesDir);
    const bag = {};
    for (const jsonName of jsonNames) {
        const fileName = jsonName.replace(/\.[^.]*$/, '');
        bag[fileName] = {
            title: fileName,
            content: JSON.parse(fs.readFileSync(filesDir + '/' + jsonName, 'utf8')),
        };
    }
    return bag;
};

/**
 *
 */
const collectRaw = (focus) => {
    const rawNames = focus ? [focus.replace(/\.[^.]*$/, '')] : fs.readdirSync(RAW);
    const bag = {};
    for (const fileName of rawNames) {
        bag[fileName] = {
            title: fileName,
            content: {
                sha1: getSha1(RAW + '/' + fileName),
            },
        };
    }
    return bag;
};

/**
 *
 */
const getSha1 = (path) => {
    const generator = crypto.createHash('sha1');
    generator.update(fs.readFileSync(path));
    return generator.digest('hex');
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = inspectImages;
