const fs = require('fs');
const {join} = require('path');

const tally = require('../utils/tally');
const getFilePath = require('../utils/getFilePath');
const jsonParse = require('../utils/jsonParse');
const prettyName = require('../utils/prettyName');
const {STORAGE} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * {
 *     synchronized: {...},
 *     different: {...},
 *     cloudOnly: {...},
 *     localOnly: {...},
 * }
 */
const inspect = (pages, focus) => {
    console.log('Inspecting pages...');
    const synchronized = {};
    const different = {};
    const cloudOnly = {};
    for (const filePath in pages) {
        const page = pages[filePath];
        const fullFilePath = STORAGE + '/' + filePath;
        if (fs.existsSync(fullFilePath)) {
            const fileContent = fs.readFileSync(fullFilePath, 'utf8');
            const localContent = getModifiedLocalContent(page.content, fileContent);
            if (localContent) {
                different[filePath] = {...page, localContent};
            } else {
                synchronized[filePath] = page;
            }
        } else {
            cloudOnly[filePath] = page;
        }
    }
    const localOnly = getLocalOnly(pages, focus);
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
const getLocalOnly = (pages, focus) => {
    const localOnly = {};
    let localFiles;
    if (focus) {
        const filePath = getFilePath(focus, focus.startsWith('File:') ? {} : '');
        localFiles = [filePath];
    } else {
        localFiles = walk(STORAGE, '');
    }
    for (const localFile of localFiles) {
        if (!(localFile in pages)) {
            const title = prettyName(localFile);
            const fileContent = fs.readFileSync(STORAGE + '/' + localFile, 'utf8');
            const content = localFile.startsWith('File/') ? JSON.parse(fileContent) : fileContent;
            localOnly[localFile] = {title, content};
        }
    }
    return localOnly;
};

/**
 * https://stackoverflow.com/a/16684530
 */
const walk = (dir, prefix, results = []) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const joinedPath = join(dir, file);
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            walk(joinedPath, file + '/', results);
        } else {
            results.push(prefix + file);
        }
    }
    return results;
};

/**
 *
 */
const getModifiedLocalContent = (pageContent, fileContent) => {
    if (typeof pageContent === 'string') {
        return pageContent === fileContent ? false : fileContent;
    } else {
        const {sha1} = pageContent;
        const json = jsonParse(fileContent);
        return sha1 === json?.sha1 ? false : json;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = inspect;
