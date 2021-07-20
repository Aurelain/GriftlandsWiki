const assert = require('assert');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
let cleaned = 0;
// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const cleanDescriptions = (bag) => {
    for (const id in bag) {
        cleanDescription(bag[id]);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanDescription = ({desc, descParams, enclosure}) => {
    if (!desc) {
        return;
    }
    let draft = desc;
    if (descParams) {
        const computedParams = getComputedParams(descParams, enclosure);
    }
    // for (const fragment in DESCRIPTION_FIXES) {
    //     draft = draft.split(fragment).join(DESCRIPTION_FIXES[fragment]);
    // }
    // draft = draft.replace(/<b>(.*?)<\/>/g, '[[$1]]');
    // draft = draft.split('<#UPGRADE>').join('');
    // draft = draft.split('</>').join('');
    // for (const condition in conditions) {
    //     draft = draft.split('{' + condition + '}').join('[[' + conditions[condition] + ']]');
    // }
    if (draft !== desc) {
        console.log('================');
        console.log('old:', desc);
        console.log('new:', draft);
    }
};

/**
 *
 */
const getComputedParams = (params, enclosure) => {
    const selfVariables = params.match(/#\w+/g);
    if (selfVariables) {
        for (const selfVariable of selfVariables) {
            const variableName = selfVariable.substr(1);
            const value = captureNumber(enclosure, variableName);
            if (value === undefined) {
                console.log('variableName:', variableName);
                console.log('enclosure:', enclosure);
                console.log('cleaned:', cleaned);
                process.exit();
            }
        }
        cleaned++;
    }
};

/**
 *
 */
const captureNumber = (text, prop) => {
    const re = new RegExp('\\s*' + prop + '\\s*=\\s*(\\d+)');
    const found = text.match(re);
    if (found) {
        return Number(found[1]);
    }
};
// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = cleanDescriptions;
