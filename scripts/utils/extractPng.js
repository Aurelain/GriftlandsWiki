const fsExtra = require('fs-extra');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * A tex file stores its geometry as left/top/right/bottom as ratios (little endian floating numbers) relative to
 * sprite-sheet's width and height. This geometry starts after the path to the sprite-sheet.
 *
 * Sample from "Gen" portrait (ed2f9063-6599-4cdc-8d86-dec98f7ba6a5.tex):
 * A2 76 25 3F // left, on slots 41,42,43,44
 * 32 35 60 3F // top, on slots 45,46,47,48
 * FA 18 34 3F // right, on slots 49,50,51,52
 * CE CA 6F 3F // bottom, on slots 53,54,55,56
 */
const extractPng = async (texBuffer, pngPath, pipeline, flipped = false) => {
    const {rawWidth, rawHeight} = pipeline.options.input;
    const geometryIndex = texBuffer.indexOf('2e746578', 0, 'hex') + 8; // find the string ".tex" and jump 8 bytes
    const left = Math.round(rawWidth * readFloat(texBuffer, geometryIndex));
    const top = Math.round(rawHeight * readFloat(texBuffer, geometryIndex + 4));
    const right = Math.round(rawWidth * readFloat(texBuffer, geometryIndex + 8));
    const bottom = Math.round(rawHeight * readFloat(texBuffer, geometryIndex + 12));
    const width = right - left;
    const height = bottom - top;
    fsExtra.ensureDirSync(pngPath.replace(/[^\/]*$/, ''));
    await pipeline.clone().extract({left, top, width, height}).flop(flipped).toFile(pngPath);
};
// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const readFloat = (buffer, offset) => buffer.slice(offset, offset + 4).readFloatLE(0);

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = extractPng;
