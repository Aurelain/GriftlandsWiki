const fs = require('fs');
const fsExtra = require('fs-extra');

const attemptSelfRun = require('../utils/attemptSelfRun');
const guard = require('../utils/guard');
const inspect = require('./inspect');
const writeWikiMetadata = require('./writeWikiMetadata');
const pullTexts = require('./pullTexts');
const pullFiles = require('./pullFiles');
const {STORAGE, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 * @param all         If present, this flag will force a complete pull, disregarding any existing wikiMetadata.
 * @returns {Promise<{}>}
 */
const pull = async (all = '') => {
    try {
        const wikiMetadata = all ? {} : getWikiMetadata();
        const {lastPulled} = wikiMetadata;

        const texts = await pullTexts(lastPulled);
        const files = await pullFiles(lastPulled);
        const pages = {...texts, ...files};
        writeWikiMetadata(pages, lastPulled ? wikiMetadata : null);

        const status = inspect(pages, lastPulled);

        if (await guard(status, true)) {
            const pendingWrite = {...status.different, ...status.cloudOnly};
            writePages(pendingWrite);
            removeOrphanPages(status.localOnly);
        }

        console.log('Pull finished.');
        return status;
    } catch (e) {
        console.log('Error:', e.message);
        DEBUG && console.log(e.stack);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getWikiMetadata = () => {
    try {
        return JSON.parse(fs.readFileSync('wikiMetadata.json', 'utf8'));
    } catch (e) {
        return {};
    }
};

/**
 *
 */
const writePages = (pages) => {
    console.log('Writing to disk...');
    for (const filePath in pages) {
        const {content} = pages[filePath];
        const fullFilePath = STORAGE + '/' + filePath;
        const fullFileDir = fullFilePath.replace(/[^/]*$/, '');
        fsExtra.ensureDirSync(fullFileDir);
        const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 4);
        fs.writeFileSync(fullFilePath, fileContent);
    }
};

/**
 *
 */
const removeOrphanPages = (orphanPages) => {
    console.log('DELETING orphan pages...');
    for (const fileName in orphanPages) {
        fs.unlinkSync(STORAGE + '/' + fileName);
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pull;
attemptSelfRun(pull);
