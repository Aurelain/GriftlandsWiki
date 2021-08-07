const fs = require('fs');
const computeSha1 = require('../utils/computeSha1');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const writeWikiMetadata = (pages, existingWikiMetadata) => {
    const pageMetadata = existingWikiMetadata ? {...existingWikiMetadata.pageMetadata} : {};
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
    const existingPageMetadataString = getExistingPageMetadata(existingWikiMetadata);
    const futurePageMetadataString = JSON.stringify(pageMetadata, null, 4);
    if (existingPageMetadataString !== futurePageMetadataString) {
        fs.writeFileSync('wikiMetadata.json', JSON.stringify(wikiMetadata, null, 4));
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getExistingPageMetadata = (existingWikiMetadata) => {
    if (existingWikiMetadata) {
        return JSON.stringify(existingWikiMetadata.pageMetadata, null, 4);
    }
    try {
        const pageMetadata = JSON.parse(fs.readFileSync('wikiMetadata.json', 'utf8')).pageMetadata;
        return JSON.stringify(pageMetadata, null, 4);
    } catch (e) {}
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeWikiMetadata;
