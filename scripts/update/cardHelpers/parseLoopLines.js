const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');

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
    lines = lines.replace(/^[^{]*{/, '');
    lines = lines.replace(/}[^}]*$/, '');
    lines = lines.replace(/.*\bassert\b.*/g, '');
    lines = lines.replace(/~=/g, '!==');
    lines = lines.replace(/.*Add\w+Card.*/g, '');
    lines = lines.replace(/^\s*table\.insert.*/gm, '');
    lines = lines.replace(/^\s*CONDITION_LOOKUPS.*/gm, '');

    // "scripts/content/negotiation/ai_negotiation.lua" has difficult condition so we remove it:
    lines = lines.replace(/.*?Check\w*Bits[^}]*}/g, '');

    // "scripts/content/attacks/monster_actions.lua"
    lines = lines.replace(/SetBits\((.*?),(.*?)\)/g, '($1)|$2');

    // "scripts/content/negotiation/flourish_defs.lua"
    // TODO
    lines = lines
        .split('string.format( "negotiation/%s.tex", id:match( "(.*)_ii.*$" ) )')
        .join('"negotiation/" + id.match(/(.*)_ii.*$/)[1] + ".tex"');
    lines = lines
        .split('string.format( "battle/%s.tex", id:match( "(.*)_ii.*$" ) )')
        .join('"battle/" + id.match(/(.*)_ii.*$/)[1] + ".tex"');

    lines = lines.replace(/:find\(\s*"(.*?)"\s*\)/g, '.match(/$1/)'); // rook_item_negotiation.lua
    lines = lines.replace(/:match\(\s*"(.*?)"\s*\)/g, '.match(/$1/)'); // flourish_defs.lua
    lines = convertConstants(lines);

    lines = adaptBitField(lines);
    lines = stringifyArrays(lines);
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

/**
 *
 */
const stringifyArrays = (lines) => {
    let draft = lines;
    const arraysFound = draft.matchAll(/=\s*{/g);
    for (const {index} of arraysFound) {
        const arrayBlock = findEnclosure(lines, index, '{', '}');
        // draft = draft.split(arrayBlock).join('= "' + JSON.stringify(arrayBlock) + '"');
        draft = draft.split(arrayBlock).join('= "array"');
    }
    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = parseLoopLines;
