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
    const output = {
        // TODO: parse these dynamically
        UNPLAYABLE: 'Unplayable',
        EXPEND: 'Expend',
        MULTISHOT: 'Multishot',
        AMBUSH: 'Ambush',
        CONSUME: 'Destroy',
        PIERCING: 'Piercing',
        PARASITE: 'Parasite',
        FLOURISH: 'Flourish',
        STICKY: 'Sticky',
        TOOLBOX: 'Toolbox',
        BURNOUT: 'Burnout',
        RESTRAINED: 'Restrained',
        SCORE: 'Score',
        GALVANIZED: 'Galvanized',
        SLIMY: 'Slimy',
        SLEEP_IT_OFF: 'Sleep It Off',
        COMBO_FINISHER: 'Finisher',
        DUD: 'Dud',
    };
    for (const entry of entries) {
        const {entryName} = entry;
        if (entryName.endsWith('.lua')) {
            const lua = entry.getData().toString('utf8');
            parseConditionsFromLua(lua, output);
        }
    }
    output['SNAILS'] = 'Snails';
    output['HEADS'] = 'Heads';
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
    const conditionsRegExp = /conditions\s*=\s*{|modifiers\s*=\s*{|FEATURES\s*=\s*{/gi;
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
    block.replace(/(\w+)\s*=\s*{[^{}]*?\bname\s*=\s*"(.*?)"/g, (matched, capturedId, capturedName) => {
        conditions[capturedId] = capturedName;
    });
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getConditions;
