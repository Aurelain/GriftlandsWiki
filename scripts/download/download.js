const fs = require('fs');
const crypto = require('crypto');
const fsExtra = require('fs-extra');
const axios = require('axios');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * Directory which contains the metadata describing each file.
 */
const METADATA_DIR = __dirname + '/../../wiki/File';

/**
 * Directory where we'll store the downloaded files.
 */
const DESTINATION = __dirname + '/../../raw/web';

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
const download = async () => {
    const candidates = collectCandidates();
    fsExtra.ensureDirSync(DESTINATION);
    for (let i = 0; i < candidates.length; i += PARALLEL_DOWNLOADS) {
        const parallelCandidates = candidates.slice(i, i + PARALLEL_DOWNLOADS);
        const requests = parallelCandidates.map(({url}) => {
            console.log('url:', url);
            return axios.get(url, {responseType: 'arraybuffer'});
        });
        const results = await Promise.all(requests);
        for (let j = 0; j < requests.length; j++) {
            const {destinationFile} = parallelCandidates[j];
            fs.writeFileSync(destinationFile, results[j].data, {encoding: null});
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const collectCandidates = () => {
    const jsonNames = fs.readdirSync(METADATA_DIR);
    const output = [];
    for (const jsonName of jsonNames) {
        const fileName = jsonName.replace(/\.[^.]*$/, '');
        const {url, sha1} = JSON.parse(fs.readFileSync(METADATA_DIR + '/' + jsonName, 'utf8'));
        const destinationFile = DESTINATION + '/' + fileName;
        if (!fs.existsSync(destinationFile) || getSha1(destinationFile) !== sha1) {
            output.push({
                destinationFile,
                url,
            });
        }
    }
    return output;
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
module.exports = download;
