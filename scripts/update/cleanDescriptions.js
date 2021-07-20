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
const cleanDescription = ({desc, descParams, enclosure, name}) => {
    if (!desc) {
        return;
    }
    let draft = desc;
    const requiredParams = getRequiredParams(desc);
    if (requiredParams) {
        assert(descParams, `A description requires params, but they were not provided! ${name}`);
        const parts = descParams.split(',');
        for (const param in requiredParams) {
            const mutationParam = parts[Number(param) - 1];
            assert(
                mutationParam,
                `Expecting a format parameter for ${name}: ${param} in ${desc}. DescParams: ${descParams}`
            );
            const value = evaluateMutationParam(mutationParam, enclosure, name);
            draft = draft.split('{' + param + '}').join(value);
            // console.log(`${param}=${value}`);
        }
        // const computedParams = getComputedParams(descParams, enclosure);
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
        console.log('================', name);
        console.log('old:', desc);
        console.log('new:', draft);
    }
};

/**
 *
 */
const getRequiredParams = (desc) => {
    const found = desc.match(/{\d}/g);
    if (found) {
        const bag = {};
        for (const param of found) {
            bag[param.match(/\d/)[0]] = true;
        }
        return bag;
    }
};

/**
 *
 */
const evaluateMutationParam = (mutationParam, enclosure, name) => {
    let draft = mutationParam;
    const selfVariables = mutationParam.match(/#\w+/g);
    if (selfVariables) {
        for (const selfVariable of selfVariables) {
            const variableName = selfVariable.substr(1);
            let value = captureNumber(enclosure, variableName);
            if (value === undefined) {
                console.log(`Warning: "${name}" does not provide a "${variableName}" field!`);
                value = 0; // so it fails "or" checks
            }
            draft = draft.split('#' + variableName).join(value);
        }
        cleaned++;
    }
    return eval(draft);
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
