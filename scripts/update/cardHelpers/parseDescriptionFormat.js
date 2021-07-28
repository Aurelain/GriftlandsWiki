const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Input: '...desc_fn = ... loc.format(fmt_str, self.defend_amount * 2 , self.riposte_amount or 1)...'
 * Output: '#defend_amount*2,#riposte_amount||1'
 */
const parseDescriptionFormat = (enclosure, name) => {
    // Get the description mutation function:
    const index = enclosure.indexOf('desc_fn');
    if (index < 0) {
        return;
    }
    let draft = findEnclosure(enclosure, index, '{', '}');
    if (!draft) {
        return;
    }

    if (draft.includes('"NO_CARD"')) {
        // for the "status_pinned" card
        return;
    }

    // Some cards (e.g. "Garbage Day") have a branching logic:
    // - when running live, a branch adds a dynamic string at the end of the card
    // - in compendium, the other branch does something simple.
    // We're removing the first branch:
    draft = draft.replace(/\bif\b[\s\S]*?}/, '');

    if (draft.includes('return fmt_str') || draft.match(/{\s*}/)) {
        return; // no special formatting needed, e.g. "Wretched Strike"
    }

    // Get the formatter function:
    const found = draft.match(/return loc\.format\((.*)/);
    assert(found, `Could not find formatter function for "${name}"!`);
    draft = found[1].split(',').slice(1).join(',');
    if (!draft) {
        return; // no first parameter was provided, e.g. "gallery_plus"
    }

    // "Twisted Know a Guy" is a trap (doesn't actually have a special format)
    if (draft.includes('self.negotiator:GetName')) {
        return;
    }

    // "Blacklist"
    draft = draft.split('self.userdata.names_taken and #self.userdata.names_taken or 0').join('0');

    // "Domain"
    draft = draft.split('self.base_comp + played * self.comp_increment').join('self.base_comp');

    // "Grisly Trophy"
    draft = draft.split('self.def.modifier.turns, self.def.modifier.damage').join('3, 8');

    // "Casings"
    draft = draft.split('self.dummy_condition:CalculateDefendText(self.defend_amt)').join('self.defend_amt');

    // "Underdriver"
    draft = draft.split('self:CalculateDefendText(current_bonus)').join('self.base_def');

    // "Sharpen"
    draft = draft.split('(self.stacks or 2)').join('2');

    // "Assassin's Mark"
    draft = draft.replace(/self.*?UI\.CARDS\.OWNER[^,]*/, '"Owner"');

    // "Big Score" and others
    draft = draft.split('self.scoring.value').join('self.value');

    // "Striker" and others
    draft = draft.split('self:CalculateThresholdText(self)').join('self.threshold');

    // "Rationale" and others
    draft = draft.replace(/self:CalculateComposureText\((.*?)\)/g, '$1');

    // "Carapace" and others
    draft = draft.replace(/self:CalculateDefendText\(([^,)]*).*?\)/g, '$1');

    // "Lifeline" and others:
    draft = draft.split(' or ').join('||');

    // Remove garbage at the end:
    draft = draft.replace(/[^\w"]+$/g, '');

    // Remove ALL whitespace:
    draft = draft.replace(/\s*/g, '');

    // Make it more readable:
    draft = draft.split('self.').join('#');

    return draft;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = parseDescriptionFormat;
