const fs = require('fs');
const crypto = require('crypto');

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
            sha1: typeof content === 'string' ? getSha1(content) : content.sha1,
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
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getSha1 = (content) => {
    const generator = crypto.createHash('sha1');
    generator.update(content);
    return generator.digest('hex');
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeWikiMetadata;
