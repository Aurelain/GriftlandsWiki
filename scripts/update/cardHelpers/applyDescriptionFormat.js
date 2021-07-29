const assert = require('assert');
const findEnclosure = require('../../utils/findEnclosure');
const fromBase64 = require('../../utils/fromBase64');
const restoreLuaTexts = require('../../utils/restoreLuaTexts');

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Input:
 * {
 *     desc_fn: function( self, fmt_str ){
 *          if ( type(self.userdata.chosen_effect) :: "#c3RyaW5n" and self.userdata.reveal ) {
 *              return loc.format( fmt_str, self.def:GetLocalizedString( self.userdata.chosen_effect ))
 *          } else {
 *              return loc.format( fmt_str, self.def:GetLocalizedString( "#VU5LTk9XTl9ERVND" ) )
 *          }
 *      }
 * Output:
 */
const applyDescriptionFormat = (description, card) => {
    const requiredNumbers = getRequiredNumbers(description);
    if (!requiredNumbers) {
        return description;
    }

    const {desc_fn, name} = card;
    assert(desc_fn, `A description uses numbers, but no solution was provided! ${name}`);

    let code = fromBase64(desc_fn.substr(2));
    code = restoreLuaTexts(code);
    code = code.replace(/(\S):(\S)/g, '$1.$2'); // `self.source:GetName()` -> `self.source.GetName()`
    code = code.replace(/ : /g, ' = ');
    code = code.replace(/~:/g, '!=');
    code = code.replace(/::/g, '===');
    code = code.replace(/\bor\b/g, '||');
    code = code.replace(/\band\b/g, '&&');
    code = code.replace(/\bnull\b/g, 'undefined'); // this suits better in "Invective"
    code = code.replace(/\bLOC\b/g, ''); // "Slice"
    code = code.replace(/\btype\(/g, 'typeof ('); // "Unknown Concoction"
    code = code.replace(/\bself\.def\b/g, 'self');
    code = code.replace(/#self/g, 'self'); // "Blacklist"
    code = code.replace(/\blocal\s*(\w+)\s*=/g, 'let $1 =');
    code = code.replace(/\bloc.format\(/g, 'locFormat(');
    code = code.replace(/loc.cap\([^)]*UI.CARDS.OWNER.*?\)/g, '"Owner"'); // "Assassin's Mark"
    code = code.replace(/self\.GetLocalizedString\((.*?)\)/g, 'self.loc_strings[$1]'); // "Pinned"
    code = code.replace(/ \.\. /g, ' + '); // "Lumin Burn"
    code = code.replace(/self[\w.]*CalculateDefendText\((.*?)\)/g, '$1'); // "Carapace"
    code = code.replace(/self[\w.]*CalculateComposureText\((.*?)\)/g, '$1'); // "Rationale"
    code = code.replace(/self.CalculateThresholdText.*?\)/g, 'self.threshold'); // "Striker"
    code = code.replace(/CombatCondition.*?\)/g, 'true'); // "Casings"
    code = code.replace(/.*GetDiscardDeck.*/g, ''); // "Garbage Day"
    code = code.replace(/is_instance\(.*?\)/g, 'false'); // "Tough and Angry"
    code = code.replace(/GetAdvancementModifier\(.*?\)/g, '0'); // "Toxic Fumes"
    code = code.replace(/let fmt_str = def\.GetLocalizedDesc.*?\)/g, ''); // "Invective"

    // Obtain the js function:
    let fn;
    try {
        fn = eval('(' + code + ')');
    } catch (e) {
        assert(0, `${name}: ${e.message}\nCannot evaluate function body:\n${code}`);
    }

    // Run the js function:
    card.userdata = {}; // temporarily needed for some conditions
    let adaptedDescription;
    try {
        adaptedDescription = fn(card, description);
    } catch (e) {
        assert(0, `${name}: ${e.message}\nCannot run function:\n${code}`);
    }
    delete card.userdata;

    return adaptedDescription;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getRequiredNumbers = (desc) => {
    const found = desc.match(/{\d/g);
    if (found) {
        const bag = {};
        for (const param of found) {
            bag[param.match(/\d/)[0]] = true;
        }
        return bag;
    }
};

// noinspection JSUnusedLocalSymbols
/**
 * Used in evaluation.
 */
const locFormat = (desc, ...rest) => {
    for (let i = 0; i <= rest.length; i++) {
        const n = i + 1;
        const value = rest[i];
        if (value === undefined) {
            continue;
        }

        // Resolve all "foo {n} bar" instances:
        desc = desc.split('{' + n + '}').join(value);

        // Also replace the number in "foo {n*card|cards} bar"
        const noun = value === 1 ? '$1' : '$2';
        desc = desc.replace(new RegExp('\\{' + n + '\\*(.*?)\\|(.*?)}', 'g'), noun);
    }
    return desc;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = applyDescriptionFormat;
