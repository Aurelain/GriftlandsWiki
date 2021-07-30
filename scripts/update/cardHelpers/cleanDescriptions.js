const applyDescriptionFormat = require('./applyDescriptionFormat');
const debugCard = require('../../utils/debugCard');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const DESCRIPTION_FIXES = {
    '<b>Thresholds</>': '[[Threshold|Thresholds]]',
    '<b>Expended</>': '[[Expend|Expended]]',
};

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
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanDescription = (card, keywords, bag) => {
    const {desc, name} = card;
    if (!desc) {
        return;
    }
    let draft = desc;

    // "Big Score" and others have a description like: "Gain {1#points_total}..."
    draft = draft.replace(/{(\d)#points_total}/g, '{$1} PTS');

    // "A Hot Tip" and others have a description like: "Gain {1#money}..."
    draft = draft.replace(/{(\d)#money}/g, '{$1} shill');

    // "Legacy Blade" and others have a description like: "Gain {1#points}..."
    draft = draft.replace(/{(\d)#points}/g, '{$1} PTS');

    draft = applyDescriptionFormat(draft, card);

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
    draft = draft.replace(/{([^}]*)\|(\w+[a-z])}/g, (matched, keyword, word) => {
        const keywordInfo = keywords[keyword];
        debugCard(keywordInfo, card, `Unrecognized worded keyword! ${draft}`);
        return '[[' + keywordInfo.name + '|' + word + ']]';
    });

    for (const keyword in keywords) {
        draft = draft.split('{' + keyword + '}').join('[[' + keywords[keyword].name + ']]');
    }

    draft = draft.split('\\n').join('\n');

    if (draft.match(/[{#\\<]/)) {
        // console.log('================', name);
        // console.log('old:', desc);
        // console.log('new:', draft);
        // console.log('card:', card);
        console.log(`Strange description: ${name} = ${draft.split('\n').join('<br/>')}`);
    }

    draft = draft.split('\n').join('<br/>');

    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = cleanDescriptions;
