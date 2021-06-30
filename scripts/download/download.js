const fs = require('fs');
const axios = require('axios'); // TODO: replace with got

const attemptSelfRun = require('../utils/attemptSelfRun');
const inspectImages = require('./inspectImages');
const guard = require('../utils/guard');
const {RAW, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 *
 */
const PARALLEL_DOWNLOADS = 5;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const download = async (focus = '') => {
    try {
        const status = await inspectImages(focus);
        if (!(await guard(status, true))) {
            return;
        }
        await createOrUpdateRaw({...status.different, ...status.cloudOnly});
        await deleteRaw(status.localOnly);
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
const createOrUpdateRaw = async (bag) => {
    const fileNames = Object.keys(bag);
    for (let i = 0; i < fileNames.length; i += PARALLEL_DOWNLOADS) {
        const parallelFileNames = fileNames.slice(i, i + PARALLEL_DOWNLOADS);
        const requests = parallelFileNames.map((fileName) => {
            const {url} = bag[fileName].content;
            console.log(`Downloading "${fileName}" from ${url}`);
            return axios.get(url, {responseType: 'arraybuffer'});
        });
        const results = await Promise.all(requests);
        for (let j = 0; j < requests.length; j++) {
            fs.writeFileSync(RAW + '/' + parallelFileNames[j], results[j].data, {encoding: null});
        }
    }
};

/**
 *
 */
const deleteRaw = async (bag) => {
    for (const fileName in bag) {
        fs.unlinkSync(RAW + '/' + fileName);
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = download;
attemptSelfRun(download);
