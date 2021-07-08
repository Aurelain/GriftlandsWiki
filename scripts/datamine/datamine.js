const attemptSelfRun = require('../utils/attemptSelfRun');
const {GAME_DIR, DEBUG} = require('../utils/CONFIG');
const fs = require('fs');
const Jimp = require('jimp');
const decompressDds = require('../utils/decompressDds');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const datamine = async () => {
    try {
        const buffer = Buffer.from(fs.readFileSync(__dirname + '/portraits.dds')).buffer;
        const dds = decompressDds(buffer);
        new Jimp(dds, (err, image) => {
            image.write(__dirname + '/aur.png');
        });
    } catch (e) {
        console.log(DEBUG ? e.stack : e.message);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = datamine;
attemptSelfRun(datamine);
