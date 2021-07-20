const assert = require('assert');
const tally = require('../utils/tally');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Input: '...desc_fn = ... loc.format(fmt_str, self.defend_amount * 2 , self.riposte_amount or 1)...'
 * Output: '#defend_amount*2,#riposte_amount||1'
 */
const parseDescriptionFormat = (description, enclosure, name) => {
    if (!description || !description.match(/{\d}/)) {
        return;
    }

    // Get the description mutation function:
    let draft = (enclosure.match(/desc_fn\s*=[\s\S]*?\bend\b/) || [])[0];
    if (!draft) {
        return;
    }

    // Some cards (e.g. "Garbage Day") have a branching logic:
    // - when running live, a branch adds a dynamic string at the end of the card
    // - in compendium, the other branch does something simple.
    // We're removing the first branch:
    draft = draft.replace(/\bif\b[\s\S]*?else/, '');

    // Get the formatter function:
    const found = draft.match(/return loc\.format\(.*?,(.*)/);
    assert(found, `Could not find formatter function for "${name}"!`);
    draft = found[1];

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

    // "Krill Ichor" doesn't have stacks
    // draft = draft.split('self.power_amt, self.stacks').join('self.power_amt');

    // "Striker" and others
    draft = draft.split('self:CalculateThresholdText(self)').join('self.threshold');

    // "Rationale" and others
    draft = draft.replace(/self:CalculateComposureText\((.*?)\)/g, '$1');

    // "Carapace" and others
    draft = draft.replace(/self:CalculateDefendText\(([^,)]*).*?\)/g, '$1');

    // "Sharpen" has some useless parenthesis:
    draft = draft.replace(/[()]/g, '');

    // "Lifeline" and others:
    draft = draft.split(' or ').join('||');

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
