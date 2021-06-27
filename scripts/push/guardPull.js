const inquirer = require('inquirer');
const tally = require('../utils/tally');

const ENUMERATE_SOME = 8;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const guardPull = async (status) => {
    const {different, cloudOnly, localOnly} = status;
    if (tally(different) === 0 && tally(cloudOnly) === 0 && tally(localOnly) === 0) {
        console.log('No push needed.');
        process.exit(0);
    }

    console.log('You are about to:');
    guardFor(localOnly, 'Create $ text pages in the cloud:', true);
    guardFor(localOnly, 'Create $ images in the cloud:', false);
    guardFor(different, 'Update $ text pages in the cloud:', true);
    guardFor(different, 'Update $ images in the cloud:', false);
    guardFor(cloudOnly, 'DELETE $ text pages from the cloud:', true);
    guardFor(cloudOnly, 'DELETE $ images from the cloud:', false);

    const response = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue?',
        default: true,
    });
    if (!response.continue) {
        process.exit(0);
    }
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
module.exports = guardPull;
