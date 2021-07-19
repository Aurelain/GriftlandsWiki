const findEnclosure = require('../utils/findEnclosure');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Output:
 * {
 *
 * }
 */
const getConditions = (zip) => {
    const entries = zip.getEntries();
    const output = {};
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            parseConditionsFromLua(lua, output);
        }
    }
    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const parseConditionsFromLua = (luaContent, conditions) => {
    let draft = luaContent.replace(/--\[\[[\s\S]*?]]--/g, ''); // remove block comments
    draft = draft.replace(/--.*/g, ''); // remove  comments
    const conditionsRegExp = /conditions\s*=\s*{/gi;
    let myResult;
    while ((myResult = conditionsRegExp.exec(draft)) !== null) {
        const index = conditionsRegExp.lastIndex - myResult[0].length;
        const enclosure = findEnclosure(draft, index, '{', '}');
        if (!enclosure) {
            continue;
        }
        parseConditionsFromBlock(enclosure, conditions);
    }
};

/**
 *
 */
const parseConditionsFromBlock = (block, conditions) => {
    block.replace(/(\w+)\s*=\s*{\s*name\s*=\s*"(.*?)"/g, (matched, capturedId, capturedName) => {
        conditions[capturedId] = capturedName;
    });
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getConditions;
