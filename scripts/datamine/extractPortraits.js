const sharp = require('sharp');
const decompressDds = require('../utils/decompressDds');
const getCharacters = require('../update/getCharacters');
const extractPng = require('../utils/extractPng');
const {RAW_GAME} = require('../utils/CONFIG');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const extractPortraits = async (dataZip, scriptsZip) => {
    const portraitsTex = dataZip.getEntry('portraits/portraits.tex').getData();
    const portraitsDds = Buffer.from(portraitsTex.slice(9)).buffer;
    const dds = decompressDds(portraitsDds);
    const pipeline = sharp(dds.data, {raw: {width: dds.width, height: dds.height, channels: 4}}).png();

    const characters = await getCharacters(scriptsZip);
    for (const {name, uuid} of characters) {
        if (uuid) {
            const texBuffer = dataZip.getEntry('portraits/' + uuid + '.tex').getData();
            const pngPath = RAW_GAME + `/portraits/${name}_portrait.png`;
            await extractPng(texBuffer, pngPath, pipeline, true);
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractPortraits;
