const inquirer = require('inquirer');
const tally = require('../utils/tally');

const ENUMERATE_SOME = 8;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const guard = async (status, isPull) => {
    const {different, cloudOnly, localOnly} = status;
    if (tally(different) === 0 && tally(cloudOnly) === 0 && tally(localOnly) === 0) {
        console.log('No operations needed.');
        return false;
    }

    const writeDestination = isPull ? 'on disk' : 'in the cloud';
    const deleteDestination = isPull ? 'from the disk' : 'from the cloud';
    const creationSource = isPull ? cloudOnly : localOnly;
    const deletionSource = isPull ? localOnly : cloudOnly;
    console.log('You are about to:');
    guardFor(creationSource, `Create $ text pages ${writeDestination}:`, true);
    guardFor(creationSource, `Create $ images ${writeDestination}:`, false);
    guardFor(different, `Update $ text pages ${writeDestination}:`, true);
    guardFor(different, `Update $ images ${writeDestination}:`, false);
    guardFor(deletionSource, `DELETE $ text pages ${deleteDestination}:`, true);
    guardFor(deletionSource, `DELETE $ images ${deleteDestination}:`, false);

    const response = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue?',
        default: true,
    });
    return response.continue;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const guardFor = (bag, message, isGuardText) => {
    const found = {};
    for (const filePath in bag) {
        const {title, content} = bag[filePath];
        const isText = typeof content === 'string';
        if ((isGuardText && isText) || (!isGuardText && !isText)) {
            found[title] = true;
        }
    }
    const tallyFound = tally(found);
    if (tallyFound) {
        console.log('• ' + message.replace('$', tallyFound));
        enumerateSome(found);
    }
};

/**
 *
 */
const enumerateSome = (target) => {
    let i = 0;
    for (const key in target) {
        i++;
        if (i > ENUMERATE_SOME) {
            break;
        }
        console.log('    ' + key);
    }
    if (tally(target) > ENUMERATE_SOME) {
        console.log('    ...');
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = guard;
