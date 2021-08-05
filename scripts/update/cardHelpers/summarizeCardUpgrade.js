// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
const objectify = require('../../utils/objectify');
/**
 *
 */
const summarizeCardUpgrade = (baseCard, upgradeCard) => {
    const summary = [];
    if (baseCard.cost !== upgradeCard.cost) {
        if (baseCard.cost === undefined) {
            summary.push('Receive cost ' + upgradeCard.cost);
        } else if (upgradeCard.cost === undefined) {
            summary.push('Become unplayable');
        } else {
            const delta = upgradeCard.cost - baseCard.cost;
            summary.push('Cost ' + (delta > 0 ? '+' : '-') + Math.abs(delta));
        }
    }
    if (baseCard.minDamage !== upgradeCard.minDamage) {
        if (baseCard.minDamage === undefined) {
            summary.push('Receive min damage ' + upgradeCard.minDamage);
        } else if (upgradeCard.minDamage === undefined) {
            summary.push('Lose damage');
        } else {
            const delta = upgradeCard.minDamage - baseCard.minDamage;
            summary.push('Min damage ' + (delta > 0 ? '+' : '-') + Math.abs(delta));
        }
    }
    if (baseCard.maxDamage !== upgradeCard.maxDamage) {
        if (baseCard.maxDamage === undefined) {
            summary.push('Receive max damage ' + upgradeCard.maxDamage);
        } else if (upgradeCard.maxDamage === undefined) {
            // Nothing, already handled by minDamage
        } else {
            const delta = upgradeCard.maxDamage - baseCard.maxDamage;
            summary.push('Max damage ' + (delta > 0 ? '+' : '-') + Math.abs(delta));
        }
    }
    if (simplifyDescription(baseCard.desc) !== simplifyDescription(upgradeCard.desc)) {
        summary.push(upgradeCard.desc);
    }
    const baseKeywords = baseCard.keywords ? objectify(baseCard.keywords.split(',')) : {};
    const upgradedKeywords = upgradeCard.keywords ? objectify(upgradeCard.keywords.split(',')) : {};
    for (const keyword in baseKeywords) {
        if (!(keyword in upgradedKeywords)) {
            summary.push('Removed [[' + keyword + ']]');
        }
    }
    for (const keyword in upgradedKeywords) {
        if (!(keyword in baseKeywords)) {
            summary.push('Added [[' + keyword + ']]');
        }
    }
    return summary.join(', ');
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
const simplifyDescription = (description = '') => {
    description = description.replace(/\[\[.*?]]/g, '');
    description = description.replace(/<.*?>/g, '');
    description = description.replace(/\s+/g, ' ');
    return description;
};
// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = summarizeCardUpgrade;
