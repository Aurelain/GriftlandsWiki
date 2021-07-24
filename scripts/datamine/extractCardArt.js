const sharp = require('sharp');
const decompressDds = require('../utils/decompressDds');
const extractPng = require('../utils/extractPng');
const {RAW_GAME} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const extractCardArt = async (dataZip) => {
    await extractCardArtFromFolder(dataZip, 'negotiation');
    await extractCardArtFromFolder(dataZip, 'battle');
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const extractCardArtFromFolder = async (dataZip, folderName) => {
    const portraitsTex = dataZip.getEntry(folderName + '/' + folderName + '.tex').getData();
    const portraitsDds = Buffer.from(portraitsTex.slice(9)).buffer;
    const dds = decompressDds(portraitsDds);
    const pipeline = sharp(dds.data, {raw: {width: dds.width, height: dds.height, channels: 4}}).png();

    const entries = dataZip.getEntries();
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.startsWith(folderName) && entryName.split('/').length === 2) {
            // TODO: use jszip
            const name = entryName.match(/([^/]*)\.tex$/)[1];
            if (name !== folderName) {
                const texBuffer = dataZip.getEntry(entryName).getData();
                const pngPath = RAW_GAME + '/cardArt/' + name + '#' + folderName.charAt(0).toUpperCase() + '.png';
                await extractPng(texBuffer, pngPath, pipeline);
            }
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractCardArt;
