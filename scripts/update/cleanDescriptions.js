const fs = require('fs');
const assert = require('assert');

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
const cleanDescriptions = (bag, keywords) => {
    for (const id in bag) {
        const clean = cleanDescription(bag[id], keywords, bag);
        if (clean) {
            bag[id].desc = clean;
        }
    }
    console.log('problems:', problems);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanDescription = ({desc, descParams, enclosure, name}, keywords, bag) => {
    if (!desc) {
        return;
    }
    let draft = desc;

    // "Big Score" and others have a description like: "Gain {1#points_total}..."
    // "A Hot Tip" and others have a description like: "Gain {1#money}..."
    // "Legacy Blade" and others have a description like: "Gain {1#points}..."
    draft = draft.replace(/{(\d)#\w+}/g, '{$1}');

    draft = replaceNumbers(draft, descParams, enclosure, name);

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

    // Some cards are referenced with a "card." prefix (e.g. "Nepotism" references "{card.self_promotion}").
    // We're removing it.
    draft = draft.replace(/{card\./g, '{');

    // Some cards reference other cards, e.g. "Sal's Daggers"
    for (const id in bag) {
        if (!keywords[id]) {
            draft = draft.split('{' + id + '}').join('[[' + bag[id].name + ']]');
        }
    }

    // Some cards use an alternative wording, e.g. "Amnesty: {SHIELDED|Shield} all friendly..."
    // We're using only the alternative.
    draft = draft.replace(/{[^}]*\|(\w+[a-z])}/g, '$1');

    for (const keyword in keywords) {
        draft = draft.split('{' + keyword + '}').join('[[' + keywords[keyword].name + ']]');
    }
    // if (draft !== desc) {
    if (draft.match(/[{#<]/)) {
        // console.log('================', name);
        // console.log('old:', desc);
        // console.log('new:', draft);
        console.log(`${name}: ${draft}, ${descParams}`);
        problems++;
    }

    return draft;
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
    try {
        return eval(draft);
    } catch (e) {
        console.log(`Failed to evaluate solution "${solutionPart}" for "${name}"!`);
        return 0;
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
