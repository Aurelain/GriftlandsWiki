const fs = require('fs');
const assert = require('assert');
const getConditions = require('./getConditions');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const DESCRIPTION_FIXES = {
    '<b>Thresholds</>': '[[Threshold|Thresholds]]',
    '<b>Expended</>': '[[Expend|Expended]]',
};
let problems = 0;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const cleanDescriptions = (bag, zip) => {
    const conditions = getConditions(zip);
    // fs.writeFileSync('conditions.json', JSON.stringify(conditions, null, 4));

    for (const id in bag) {
        cleanDescription(bag[id], conditions, bag);
    }
    console.log('problems:', problems);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanDescription = ({desc, descParams, enclosure, name}, conditions, bag) => {
    if (!desc) {
        return;
    }
    let draft = replaceNumbers(desc, descParams, enclosure, name);

    for (const fragment in DESCRIPTION_FIXES) {
        draft = draft.split(fragment).join(DESCRIPTION_FIXES[fragment]);
    }
    draft = draft.replace(/<b>(.*?)<\/>/g, '[[$1]]');
    draft = draft.split('<#UPGRADE>').join('');
    draft = draft.split('<#DOWNGRADE>').join('');
    draft = draft.split('</>').join('');

    // Change the syntax for numbers inside conditions:
    //      Old: foo {VULNERABILITY 5} bar
    //      New: foo 5 {VULNERABILITY} bar
    draft = draft.replace(/{(\w+) (\d+)}/g, '$2 {$1}');

    // Some cards have some kind of useless prefix, like "{ad_hominem {1}|}Gain...".
    // We're removing it.
    draft = draft.replace(/{[^}]*\|}/g, '');

    // Some cards reference other cards, e.g. "Sal's Daggers"
    for (const id in bag) {
        if (!conditions[id]) {
            // draft = draft.split('{' + id + '}').join('[[' + bag[id].name + ']]');
        }
    }

    // Some cards use an alternative wording, e.g. "Amnesty: {SHIELDED|Shield} all friendly..."
    // We're using only the alternative.
    draft = draft.replace(/{[^}]*\|(\w+[a-z])}/g, '$1');

    for (const condition in conditions) {
        draft = draft.split('{' + condition + '}').join('[[' + conditions[condition] + ']]');
    }
    // if (draft !== desc) {
    if (draft.match(/[{#<]/)) {
        // console.log('================', name);
        // console.log('old:', desc);
        // console.log('new:', draft);
        console.log(`${name}: ${draft}`);
        problems++;
    }
};

/**
 *
 */
const replaceNumbers = (desc, descParams, enclosure, name) => {
    const requiredNumbers = getRequiredNumbers(desc);
    if (!requiredNumbers) {
        return desc;
    }
    assert(descParams, `A description uses numbers, but no solution was provided! ${name}`);
    let draft = desc;
    const solutionParts = descParams.split(',');
    for (const requiredNumber in requiredNumbers) {
        const solutionPart = solutionParts[Number(requiredNumber) - 1];
        assert(solutionPart, `No solution for ${name}: ${requiredNumber} in ${desc}. descParams=${descParams}`);
        const value = evaluateSolutionPart(solutionPart, enclosure, name);

        draft = draft.split('{' + requiredNumber + '}').join(value);

        // Also replace the number in "...{n*card|cards}..."
        const noun = value === 1 ? '$1' : '$2';
        draft = draft.replace(new RegExp('\\{' + requiredNumber + '\\*(.*?)\\|(.*?)}', 'g'), noun);
    }
    return draft;
};

/**
 *
 */
const getRequiredNumbers = (desc) => {
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
const evaluateSolutionPart = (solutionPart, enclosure, name) => {
    let draft = solutionPart;
    const selfVariables = solutionPart.match(/#\w+/g);
    if (selfVariables) {
        for (const selfVariable of selfVariables) {
            const variableName = selfVariable.substr(1);
            let value = captureNumber(enclosure, variableName);
            if (value === undefined) {
                // console.log(`Warning: "${name}" does not provide a "${variableName}" field!`);
                value = 0; // so it fails "or" checks
            }
            draft = draft.split('#' + variableName).join(value);
        }
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
