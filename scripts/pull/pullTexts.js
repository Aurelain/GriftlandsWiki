const assert = require('assert').strict;
const got = require('got');
const getFilePath = require('../utils/getFilePath');
const requestMultiple = require('./requestMultiple');
const {ENDPOINT} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
/**
 * How many results the API should return for one request.
 * We tried setting this to "max" (which should be 500), and it works, but only partially:
 * we do get the desired count, but past de 50 mark we only get results that lack the revision text content.
 */
const API_LIMIT = 50;

/**
 * To get all namespaces, visit:
 * https://griftlands.fandom.com/api.php?action=query&meta=siteinfo&siprop=namespaces&format=json
 * Here's the list and what we consider interesting from a *text* point of view:
 *      0: Normal pages         <-- interesting!
 *      1: Talk
 *      2: User
 *      3: User talk
 *      4: Project
 *      5: Project talk
 *      6: File
 *      7: File talk
 *      8: MediaWiki            <-- interesting because it contains css
 *      9: MediaWiki talk
 *      10: Template            <-- interesting!
 *      11: Template talk
 *      12: Help
 *      13: Help talk
 *      14: Category            <-- interesting!
 *      15: Category talk
 *      110: Forum
 *      111: Forum talk
 *      202: UserProfile
 *      420: GeoJson
 *      421: GeoJson talk
 *      500: User blog
 *      501: User blog comment
 *      502: Blog
 *      503: Blog talk
 *      828: Module
 *      829: Module talk
 *      1200: Message Wall
 *      1201: Thread
 *      1202: Message Wall Greeting
 *      -2: Media
 *      -1: Special
 */
const TEXT_NAMESPACES = '0|8|10|14';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const pullTexts = async (startTimestamp) => {
    return requestMultiple(getSomeTexts, TEXT_NAMESPACES, startTimestamp);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

/**
 * Sample: https://griftlands.fandom.com/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&generator=allpages&gapnamespace=1&format=json
 * {
 *      pages: {
 *           'Category/Foo_Bar!%2Fdoc.wikitext': {
 *                title: 'Category:Foo Bar!/doc',
 *                content: 'hello',
 *           },
 *           ...
 *      },
 *      continuation: 'My Next Page',
 * }
 */
const getSomeTexts = async (namespaces, startTimestamp, continuation) => {
    console.log('Getting texts... ' + (continuation ? `(${continuation})` : ''));
    const gotSomeTexts = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            prop: 'revisions',
            rvprop: 'content|ids',
            rvslots: 'main',
            generator: 'allpages',
            gapnamespace: namespaces,
            gaplimit: API_LIMIT,
            gapcontinue: continuation ? continuation : undefined,
        },
        responseType: 'json',
    });
    const {body} = gotSomeTexts;
    return {
        pages: parseTextPages(body),
        continuation: body.continue?.gapcontinue,
    };
};

/**
 *
 */
const parseTextPages = (body) => {
    const pages = body?.query?.pages;
    assert(pages, 'No pages!');
    const bag = {};
    for (const key in pages) {
        const {title, revisions} = pages[key];
        const content = revisions?.[0].slots?.main?.['*'];
        assert(content, `Invalid revision content for "${JSON.stringify(pages[key])}"`);
        const revid = revisions?.[0].revid;
        assert(revid >= 0, `Invalid revision id for "${JSON.stringify(pages[key])}"`);
        const filePath = getFilePath(title, content);
        bag[filePath] = {title, content, revid};
    }
    return bag;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pullTexts;
