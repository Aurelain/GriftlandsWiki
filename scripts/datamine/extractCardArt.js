const sharp = require('sharp');
const decompressDds = require('../utils/decompressDds');
const extractPng = require('../utils/extractPng');
const getArtIds = require('../update/getArtIds');
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
const extractCardArt = async (assetsZip) => {
    const pipelines = {
        battle: getPipeline(assetsZip, 'battle'),
        negotiation: getPipeline(assetsZip, 'negotiation'),
    };
    const artIds = getArtIds(assetsZip);
    const entries = assetsZip.getEntries();
    for (const entry of entries) {
        const {entryName} = entry;
        const standardPath = entryName.replace(/\.tex$/, '').toLowerCase();
        if (standardPath in artIds) {
            const texBuffer = assetsZip.getEntry(entryName).getData();
            const [folderName, artId] = standardPath.split('/');
            const pngPath = RAW_GAME + '/cardArt/' + artId + '#' + folderName.charAt(0).toUpperCase() + '.png';
            await extractPng(texBuffer, pngPath, pipelines[folderName]);
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const extractCardArtFromFolder = async (assetsZip, isBattle, artIds) => {
    const folderName = isBattle ? 'battle' : 'negotiation';
    const portraitsTex = assetsZip.getEntry(folderName + '/' + folderName + '.tex').getData();
    const portraitsDds = Buffer.from(portraitsTex.slice(9)).buffer;
    const dds = decompressDds(portraitsDds);
    const pipeline = sharp(dds.data, {raw: {width: dds.width, height: dds.height, channels: 4}}).png();

    for (const artId in artIds) {
        if (artId.startsWith(folderName)) {
            const texBuffer = assetsZip.getEntry(folderName + '/' + artId + '.tex').getData();
            const pngPath = RAW_GAME + '/cardArt/' + artId + '#' + folderName.charAt(0).toUpperCase() + '.png';
            await extractPng(texBuffer, pngPath, pipeline);
        }
    }
};

/**
 *
 */
const getPipeline = (assetsZip, folderName) => {
    const portraitsTex = assetsZip.getEntry(folderName + '/' + folderName + '.tex').getData();
    const portraitsDds = Buffer.from(portraitsTex.slice(9)).buffer;
    const dds = decompressDds(portraitsDds);
    const pipeline = sharp(dds.data, {raw: {width: dds.width, height: dds.height, channels: 4}}).png();
    return pipeline;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractCardArt;
