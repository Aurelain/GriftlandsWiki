const fs = require('fs');
const assert = require('assert');
const {SAFETY_TIMESTAMP_PATH} = require('./CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const checkSafetyTimestamp = (timestamp) => {
    const safetyTimestamp = fs.readFileSync(SAFETY_TIMESTAMP_PATH, 'utf8');
    assert(
        timestamp === safetyTimestamp,
        `The local state is outdated!\n   local: ${safetyTimestamp}\n   online: ${timestamp}`
    );
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = checkSafetyTimestamp;
