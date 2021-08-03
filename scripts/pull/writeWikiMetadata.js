const fs = require('fs');
const computeSha1 = require('../utils/computeSha1');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const writeWikiMetadata = (timestamp, pages) => {
    const pageMetadata = {};
    for (const filePath in pages) {
        const {timestamp, content} = pages[filePath];
        pageMetadata[filePath] = {
            sha1: computeSha1(typeof content === 'string' ? content : JSON.stringify(content, null, 4)),
            timestamp,
        };
    }
    const onlineMeta = {
        lastPulled: timestamp,
        pageMetadata,
    };
    fs.writeFileSync('wikiMetadata.json', JSON.stringify(onlineMeta, null, 4));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeWikiMetadata;
