const fsExtra = require('fs-extra');
const sharp = require('sharp');

const decompressDds = require('../utils/decompressDds');
const getCharacters = require('../update/getCharacters');
const {RAW_GAME} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const PORTRAITS_DIR = 'portraits';
const PORTRAITS_TEX = 'portraits/portraits.tex';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const extractPortraits = async (dataZip, scriptsZip) => {
    const portraitsTex = dataZip.getEntry(PORTRAITS_TEX).getData();
    const portraitsDds = Buffer.from(portraitsTex.slice(9)).buffer;
    const dds = decompressDds(portraitsDds);
    const pipeline = sharp(dds.data, {raw: {width: dds.width, height: dds.height, channels: 4}}).png();

    const characters = await getCharacters(scriptsZip);
    for (const {name, uuid} of characters) {
        if (uuid) {
            await extractPortrait(name, uuid, dataZip, pipeline);
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 * The interval 41-56 (decimal) contains the bounds of the portrait.
 * Sample from Gen (ed2f9063-6599-4cdc-8d86-dec98f7ba6a5.tex):
 * A2 76 25 3F // left, on slots 41,42,43,44
 * 32 35 60 3F // top, on slots 45,46,47,48
 * FA 18 34 3F // right, on slots 49,50,51,52
 * CE CA 6F 3F // bottom, on slots 53,54,55,56
 */
const extractPortrait = async (name, uuid, dataZip, pipeline) => {
    const tex = dataZip.getEntry(PORTRAITS_DIR + '/' + uuid + '.tex').getData();
    const {rawWidth, rawHeight} = pipeline.options.input;
    const left = Math.round(rawWidth * readFloat(tex, 41));
    const top = Math.round(rawHeight * readFloat(tex, 45));
    const right = Math.round(rawWidth * readFloat(tex, 49));
    const bottom = Math.round(rawHeight * readFloat(tex, 53));
    const width = right - left;
    const height = bottom - top;
    const destinationDir = RAW_GAME + '/portraits';
    fsExtra.ensureDirSync(destinationDir);
    await pipeline
        .clone()
        .extract({left, top, width, height})
        .flop()
        .toFile(destinationDir + `/${name}_portrait.png`);
};

/**
 *
 */
const readFloat = (buffer, offset) => buffer.slice(offset, offset + 4).readFloatLE(0);

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractPortraits;
