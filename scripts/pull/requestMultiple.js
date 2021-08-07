const assert = require('assert').strict;

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * Prevents infinite loops.
 * This controls how many times we can request results (using API_LIMIT = 50) before we decide this is an endless loop.
 * Practically, we have an upper limit of 5000 results for each namespace.
 */
const LOOP_LIMIT = 100;

/**
 * A list of pages with case-sensitivity problems.
 */
const DENIED_PAGES = {
    "Sal's_campaign.wikitext": true, // because "Sal's_Campaign" (with uppercase "C") is proper title-case
    'Wind_Up.wikitext': true, // because "Wind_up.wikitext" (with lowercase "u") is proper, according to the game
    'File/Twisted_Wind_Up.png.json': true, // same as above
    'File/Boosted_Wind_Up.png.json': true, // same as above
    "File/Thieves'_instinct.png.json": true, // because "Instinct" (with uppercase "I") is proper title-case
};

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * {
 *      'Category/Foo_Bar!%2Fdoc.wikitext': {
 *          title: 'Category:Foo Bar!/doc',
 *          content: 'hello',
 *      },
 *      ...
 * }
 */
const requestMultiple = async (requestFunction, namespaces, startTimestamp) => {
    let continuation = '';
    const output = {};
    const lowercaseBag = {};
    let i = 0;
    while (true) {
        i++;
        const result = await requestFunction(namespaces, startTimestamp, continuation);
        assignWithCare(output, lowercaseBag, result.pages);
        continuation = result.continuation;
        if (i >= LOOP_LIMIT) {
            console.log('Loop limit reached!');
            break;
        }
        if (!continuation) {
            // Finished
            break;
        }
    }
    return output;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const assignWithCare = (destination, lowercaseBag, fresh) => {
    for (const id in fresh) {
        if (id in DENIED_PAGES) {
            continue;
        }
        const lowercaseId = id.toLowerCase();
        assert(!lowercaseBag[lowercaseId], `Case-sensitivity issue: "${lowercaseBag[lowercaseId]}" vs "${id}"`);
        destination[id] = fresh[id];
        lowercaseBag[lowercaseId] = id;
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = requestMultiple;
