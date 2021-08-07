const fs = require('fs');
const computeSha1 = require('../utils/computeSha1');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const writeWikiMetadata = (pages, existingWikiMetadata) => {
    const pageMetadata = existingWikiMetadata ? existingWikiMetadata.pageMetadata : {};
    for (const filePath in pages) {
        const {revid, content} = pages[filePath];
        pageMetadata[filePath] = {
            sha1: computeSha1(typeof content === 'string' ? content : JSON.stringify(content, null, 4)),
            revid,
        };
    }
    const wikiMetadata = {
        lastPulled: new Date().toISOString(),
        pageMetadata,
    };
    fs.writeFileSync('wikiMetadata.json', JSON.stringify(wikiMetadata, null, 4));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeWikiMetadata;
