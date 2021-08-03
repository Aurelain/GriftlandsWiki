const crypto = require('crypto');

/**
 *
 */
const computeSha1 = (content) => {
    const generator = crypto.createHash('sha1');
    generator.update(content);
    return generator.digest('hex');
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = computeSha1;
