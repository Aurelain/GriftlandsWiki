const fs = require('fs');
const assert = require('assert').strict;
const fsExtra = require('fs-extra');
const got = require('got');

const attemptSelfRun = require('../utils/attemptSelfRun');
const tally = require('../utils/tally');
const guard = require('../utils/guard');
const inspect = require('./inspect');
const getFilePath = require('../utils/getFilePath');
const {ENDPOINT, STORAGE, DEBUG} = require('../utils/CONFIG');

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
 * Prevents infinite loops.
 * This controls how many times we can request results (using API_LIMIT) before we decide this is an endless loop.
 * Practically, we have an upper limit of 5000 results for each namespace.
 */
const LOOP_LIMIT = 100;

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
const TEXT_NAMESPACES = {
    0: 'Main',
    8: 'MediaWiki',
    10: 'Template',
    14: 'Category',
};
const FILES_NAMESPACE = 6;
const TIMESTAMP_PATH = __dirname + '/timestamp.txt';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 * @param focus         A title to target instead of freely scanning the cloud.
 * @param ethereal      If `true`, the results will not be persisted (the disk will not be touched).
 * @returns {Promise<{}>}
 */
const pull = async (focus = '', ethereal = false) => {
    try {
        const timestamp = await getTimestamp();
        if (ethereal) {
            const localTimestamp = fs.readFileSync(TIMESTAMP_PATH, 'utf8');
            assert(timestamp === localTimestamp, 'Cannot pull ethereally because the local state is outdated!');
        }

        const pages = focus ? await getFocusedPages(focus) : await getAllInterestingPages();

        const status = inspect(pages, focus);

        if (!ethereal && (await guard(status, true))) {
            const pendingWrite = {...status.different, ...status.cloudOnly};
            writePages(pendingWrite);
            removeOrphanPages(status.localOnly);
            fs.writeFileSync(TIMESTAMP_PATH, timestamp);
        }

        console.log('Finished pull.');
        return status;
    } catch (e) {
        console.log('Error:', e.message);
        DEBUG && console.log(e.stack);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 * https://griftlands.fandom.com/api.php?action=query&list=recentchanges&rcprop=timestamp&rclimit=1&format=json
 */
const getTimestamp = async () => {
    console.log('Getting timestamp...');
    const gotTimestamp = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            list: 'recentchanges',
            rcprop: 'timestamp',
            rclimit: '1',
        },
        responseType: 'json',
    });
    const {body} = gotTimestamp;
    const timestamp = body?.query?.recentchanges?.[0]?.timestamp;
    assert(timestamp, 'Could not obtain online timestamp!');
    return timestamp;
};

/**
 *
 */
const getAllInterestingPages = async () => {
    const pages = {};
    for (const ns in TEXT_NAMESPACES) {
        const results = await getAllTextsFromNamespace(ns);
        console.log(`Namespace "${TEXT_NAMESPACES[ns]}" contains ${tally(results)} pages.`);
        Object.assign(pages, results);
    }
    console.log(`All text pages: ${tally(pages)}.`);
    const files = await getAllFiles();
    Object.assign(pages, files);
    console.log(`All images: ${tally(files)}.`);
    return pages;
};

/**
 * {
 *      'Category/Foo_Bar!%2Fdoc.wikitext': {
 *          title: 'Category:Foo Bar!/doc',
 *          content: 'hello',
 *      },
 *      ...
 * }
 */
const getAllTextsFromNamespace = async (ns) => {
    let continuation = '';
    const output = {};
    let i = 0;
    while (true) {
        i++;
        const result = await getSomeTextsFromNamespace(ns, continuation);
        Object.assign(output, result.pages);
        continuation = result.continuation;
        if (i >= LOOP_LIMIT) {
            console.log('Loop limit reached!');
            break;
        }
        if (!continuation) {
            // This namespace is complete.
            break;
        }
    }
    return output;
};

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
const getSomeTextsFromNamespace = async (ns, continuation) => {
    console.log('Getting texts... ' + (continuation ? `(${continuation})` : ''));
    const gotSomeTexts = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            prop: 'revisions',
            rvprop: 'content',
            rvslots: 'main',
            generator: 'allpages',
            gapnamespace: ns,
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
        assert(content, `Invalid revisions for "${JSON.stringify(pages[key])}"`);
        const filePath = getFilePath(title, content);
        bag[filePath] = {title, content};
    }
    return bag;
};

/**
 * {
 *     'File/Foo.png.json': {
 *         title: 'File:Foo.png',
 *         content: {
 *             url: 'https://...',
 *             sha1: '6002cb288b241fcc89353ce43fbb745ac9fd322c',
 *         },
 *     },
 *     ...
 * }
 */
const getAllFiles = async () => {
    let continuation = '';
    const output = {};
    let i = 0;
    while (true) {
        i++;
        const result = await getSomeFiles(continuation);
        if (!result) {
            return null;
        }
        Object.assign(output, result.pages);
        continuation = result.continuation;
        if (i >= LOOP_LIMIT) {
            console.log('Loop limit reached!');
            break;
        }
        if (!continuation) {
            // This namespace is complete.
            break;
        }
    }
    return output;
};

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
const getSomeFiles = async (continuation, focus) => {
    console.log('Getting images... ' + (continuation ? `(${continuation})` : ''));
    const gotSomeFiles = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            prop: 'imageinfo',
            iiprop: 'url|sha1',
            generator: 'allpages',
            gapnamespace: FILES_NAMESPACE,
            gaplimit: 'max', // max is accepted here, as opposed to texts
            gapcontinue: continuation ? continuation : undefined,
            title: focus ? focus : undefined,
        },
        responseType: 'json',
    });
    const {body} = gotSomeFiles;

    return {
        pages: parseFilePages(body),
        continuation: body.continue?.gapcontinue,
    };
};

/**
 *
 */
const parseFilePages = (body) => {
    const pages = body?.query?.pages;
    assert(pages, 'No pages!');
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

/**
 *
 */
const writePages = (pages) => {
    console.log('Writing to disk...');
    for (const filePath in pages) {
        const {content} = pages[filePath];
        const fullFilePath = STORAGE + '/' + filePath;
        const fullFileDir = fullFilePath.replace(/[^/]*$/, '');
        fsExtra.ensureDirSync(fullFileDir);
        const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 4);
        fs.writeFileSync(fullFilePath, fileContent);
    }
};

/**
 *
 */
const removeOrphanPages = (orphanPages) => {
    console.log('DELETING orphan pages...');
    for (const fileName in orphanPages) {
        fs.unlinkSync(STORAGE + '/' + fileName);
    }
};

/**
 *
 */
const getFocusedPages = async (focus) => {
    const isFile = focus.startsWith('File:');
    const {body} = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            titles: focus,
            prop: isFile ? 'imageinfo' : 'revisions',
            iiprop: isFile ? 'url|sha1' : undefined,
            rvprop: !isFile ? 'content' : undefined,
            rvslots: !isFile ? 'main' : undefined,
        },
        responseType: 'json',
    });
    if (body?.query?.pages?.[-1]) {
        // The focused title doesn't exist in the cloud.
        return {};
    }
    return isFile ? parseFilePages(body) : parseTextPages(body);
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pull;
attemptSelfRun(pull);
