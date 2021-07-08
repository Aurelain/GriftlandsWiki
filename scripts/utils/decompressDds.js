const parseDds = require('parse-dds');
const assert = require('assert');
const dxt = require('dxt-js');

/**
 *
 */
const decompressDds = (buffer) => {
    const {format, images} = parseDds(buffer);
    assert(format === 'dxt5', `Unsupported dxt format! ${format}`);

    const {shape, offset, length} = images[0];
    const compressedData = buffer.slice(offset, offset + length);

    const [width, height] = shape;
    const decompressedData = dxt.decompress(Buffer.from(compressedData), width, height, dxt.flags.DXT5);
    const data = Buffer.from(decompressedData);

    return {data, width, height};
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = decompressDds;
