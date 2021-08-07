const assert = require('assert').strict;
const got = require('got');
const getFilePath = require('../utils/getFilePath');
const requestMultiple = require('./requestMultiple');
const tally = require('../utils/tally');
const {ENDPOINT} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const API_LIMIT = 'max'; // `max` is accepted here, as opposed to texts where we are capped at 50

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const pullFiles = async (startTimestamp) => {
    const filePages = await requestMultiple(getSomeFiles, 6, startTimestamp); // 6 = File namespace
    console.log(`File pages: ${tally(filePages)}`);
    return filePages;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

/**
 * {
 *      pages: {
 *           'File/Foo.png.json': {
 *               title: 'File:Foo.png',
 *               content: {
 *                   url: 'https://...',
 *                   sha1: '6002cb288b241fcc89353ce43fbb745ac9fd322c',
 *               },
 *           },
 *           ...
 *      },
 *      continuation: 'My Next Image.png',
 * }
 */
const getSomeFiles = async (namespaces, startTimestamp, continuation) => {
    console.log('Getting files... ' + (continuation ? `(${continuation})` : ''));
    const searchParams = {
        action: 'query',
        format: 'json',
        prop: 'imageinfo',
        iiprop: 'url|sha1',
    };
    if (startTimestamp) {
        Object.assign(searchParams, {
            generator: 'recentchanges',
            grcstart: startTimestamp,
            grcdir: 'newer',
            grcnamespace: namespaces,
            grclimit: API_LIMIT,
            grccontinue: continuation ? continuation : undefined,
        });
    } else {
        Object.assign(searchParams, {
            generator: 'allpages',
            gapnamespace: namespaces,
            gaplimit: API_LIMIT,
            gapcontinue: continuation ? continuation : undefined,
        });
    }
    const gotSomeFiles = await got(ENDPOINT, {
        method: 'get',
        searchParams,
        responseType: 'json',
    });
    const {body} = gotSomeFiles;
    return {
        pages: parseFilePages(body),
        continuationObject: body?.continue,
    };
};

/**
 *
 */
const parseFilePages = (body) => {
    const pages = body?.query?.pages;
    assert(pages || body?.batchcomplete === '', 'Unexpected collection of files!');
    const bag = {};
    for (const key in pages) {
        const {title, imageinfo} = pages[key];
        const {url, sha1} = imageinfo?.[0] || {};
        assert(url && sha1, 'Invalid image info!');
        const content = {url, sha1};
        const filePath = getFilePath(title, content);
        bag[filePath] = {title, content};
    }
    return bag;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pullFiles;
