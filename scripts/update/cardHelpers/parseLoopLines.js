const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CONSTANTS = [];

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const parseLoopLines = (loopBlock) => {
    let lines = loopBlock;
    console.log('loopBlock:', loopBlock);
    lines = lines.replace(/^[^{]*{/, '');
    lines = lines.replace(/}[^}]*$/, '');
    lines = lines.replace(/.*\bassert\b.*/g, '');
    lines = lines.replace(/~=/g, '!==');
    lines = lines.replace(/.*AddNegotiationCard.*/g, '');

    // "scripts/content/negotiation/ai_negotiation.lua" has difficult condition so we remove it:
    lines = lines.replace(/if\s*\(\s*!CheckAnyBits[^}]*}/, '');

    // "scripts/content/negotiation/flourish_defs.lua"
    lines = lines
        .split('string.format( "negotiation/%s.tex", id:match( "(.*)_ii.*$" ) )')
        .join('"negotiation/" + id.match(/(.*)_ii.*$/)[1] + ".tex"');

    lines = lines.replace(/:find\(\s*"(.*?)"\s*\)/g, '.match(/$1/)'); // rook_item_negotiation.lua
    lines = lines.replace(/:match\(\s*"(.*?)"\s*\)/g, '.match(/$1/)'); // flourish_defs.lua
    lines = convertConstants(lines);

    lines = adaptBitField(lines);
    lines = lines.replace(/\bor\b/g, '||');
    return lines;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const convertConstants = (lines) => {
    for (const name of CONSTANTS) {
        lines = lines.split(name).join(`"${name}"`);
    }
    return lines.replace(/([A-Z_0-9]+\.[A-Z_0-9]+)/g, '"$1"');
};

/**
 *
 */
const adaptBitField = (lines) => {
    const bitfieldsFound = lines.matchAll(/.*\|.*/g);
    for (const bitfieldFound of bitfieldsFound) {
        const line = bitfieldFound[0];
        let draftLine = line;
        draftLine = draftLine.split('|').join(',');
        draftLine = draftLine.replace(/\((.*?) or 0\)/, '...($1 || [])');
        draftLine = draftLine.replace('=', '=[');
        draftLine += ']';
        lines = lines.split(line).join(draftLine);
    }
    return lines;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = parseLoopLines;
