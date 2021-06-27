const fs = require('fs');
const assert = require('assert').strict;
const {join} = require('path');
const fsExtra = require('fs-extra');
const got = require('got');
const tally = require('../utils/tally');
const guard = require('../utils/guard');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const ENDPOINT = 'https://griftlands.fandom.com/api.php';
// const ENDPOINT = 'http://127.0.0.1/mediawiki/api.php';

/**
 * Directory where we store the pulled pages.
 */
const DESTINATION = __dirname + '/../../wiki';

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

/**
 * A file name (in the local OS file system) cannot contain some special characters, so we replace them.
 * Besides those, we're also replacing SPACE with UNDERSCORE.
 */
const TITLE_REPLACEMENTS = {
    '\\': '%5C',
    '/': '%2F',
    ':': '%3A',
    '*': '%2A', // Doesn't get encoded by `encodeURIComponent()`
    '?': '%3F',
    '"': '%22',
    '<': '%3C',
    '>': '%3E',
    '|': '%7C',
    ' ': '_', // Special treatment
};

/**
 * The file extension we use when storing texts.
 */
const TEXT_EXTENSION = 'wikitext'; // could also be "txt"

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 * @param endpoint      The wiki url, pointing to /api.php.
 * @param ethereal      If `true`, the results will not be persisted (the disk will not be touched).
 * @param focus         A title to target instead of freely scanning the cloud.
 * @returns {Promise<{}>}
 */
const pull = async (endpoint = ENDPOINT, ethereal = false, focus = '') => {
    try {
        const pages = focus ? await getFocusedPages(endpoint, focus) : await getAllInterestingPages(endpoint);

        const status = inspectPages(pages, focus);

        if (!ethereal && (await guard(status, true))) {
            const pendingWrite = {...status.different, ...status.cloudOnly};
            writePages(pendingWrite);
            // removeOrphanPages(status.localOnly);
        }

        console.log('Finished pull.');
        return status;
    } catch (e) {
        console.log('Error:', e.message);
        // console.log(e.stack);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getAllInterestingPages = async (endpoint) => {
    const pages = {};
    for (const ns in TEXT_NAMESPACES) {
        const results = await getAllTextsFromNamespace(endpoint, ns);
        console.log(`Namespace "${TEXT_NAMESPACES[ns]}" contains ${tally(results)} pages.`);
        Object.assign(pages, results);
    }
    console.log(`All text pages: ${tally(pages)}.`);
    const files = await getAllFiles(endpoint);
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
const getAllTextsFromNamespace = async (endpoint, ns) => {
    let continuation = '';
    const output = {};
    let i = 0;
    while (true) {
        i++;
        const result = await getSomeTextsFromNamespace(endpoint, ns, continuation);
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
 *           'Category/Foo_Bar!%2Fdoc.wikitext': {
 *                title: 'Category:Foo Bar!/doc',
 *                content: 'hello',
 *           },
 *           ...
 *      },
 *      continuation: 'My Next Page',
 * }
 */
const getSomeTextsFromNamespace = async (endpoint, ns, continuation) => {
    console.log('Getting texts... ' + (continuation ? `(${continuation})` : ''));
    const gotSomeTexts = await got(endpoint, {
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
const getAllFiles = async (endpoint) => {
    let continuation = '';
    const output = {};
    let i = 0;
    while (true) {
        i++;
        const result = await getSomeFiles(endpoint, continuation);
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
const getSomeFiles = async (endpoint, continuation, focus) => {
    console.log('Getting images... ' + (continuation ? `(${continuation})` : ''));
    const gotSomeFiles = await got(endpoint, {
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
const getFilePath = (title, content) => {
    const ext = typeof content === 'string' ? TEXT_EXTENSION : 'json';
    const dir = (title.match(/^([^:]+):/) || [null, ''])[1];
    const prefix = dir ? dir + '/' : '';
    let name = dir ? title.substr(dir.length + 1) : title;
    for (const c in TITLE_REPLACEMENTS) {
        name = name.split(c).join(TITLE_REPLACEMENTS[c]);
    }
    return prefix + name + '.' + ext;
};

/**
 * {
 *     synchronized: {...},
 *     different: {...},
 *     cloudOnly: {...},
 *     localOnly: {...},
 * }
 */
const inspectPages = (pages, focus) => {
    const synchronized = {};
    const different = {};
    const cloudOnly = {};
    for (const filePath in pages) {
        const page = pages[filePath];
        const fullFilePath = DESTINATION + '/' + filePath;
        if (fs.existsSync(fullFilePath)) {
            const fileContent = fs.readFileSync(fullFilePath, 'utf8');
            if (page.content === fileContent) {
                synchronized[filePath] = page;
            } else {
                different[filePath] = page;
            }
        } else {
            cloudOnly[filePath] = page;
        }
    }
    const localOnly = getLocalOnly(pages, focus);
    const statusTally = {
        synchronized: tally(synchronized),
        different: tally(different),
        cloudOnly: tally(cloudOnly),
        localOnly: tally(localOnly),
    };
    console.log('Status tally:', JSON.stringify(statusTally, null, 4));
    return {synchronized, different, cloudOnly, localOnly};
};

/**
 *
 */
const getLocalOnly = (pages, focus) => {
    const localOnly = {};
    let localFiles;
    if (focus) {
        const filePath = getFilePath(focus, focus.startsWith('File:') ? {} : '');
        localFiles = [filePath];
    } else {
        localFiles = walk(DESTINATION, '');
    }
    for (const localFile of localFiles) {
        if (!(localFile in pages)) {
            const title = prepareTitle(localFile);
            const fileContent = fs.readFileSync(DESTINATION + '/' + localFile, 'utf8');
            const content = localFile.startsWith('File/') ? JSON.parse(fileContent) : fileContent;
            localOnly[localFile] = {title, content};
        }
    }
    return localOnly;
};

/**
 *
 */
const prepareTitle = (fileName) => {
    let title = fileName.replace(/\.[^.]*$/, '');
    title = title.replace('/', ':');
    for (const unsafe in TITLE_REPLACEMENTS) {
        const safe = TITLE_REPLACEMENTS[unsafe];
        title = title.split(safe).join(unsafe);
    }
    return title;
};

/**
 * https://stackoverflow.com/a/16684530
 */
const walk = (dir, prefix, results = []) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const joinedPath = join(dir, file);
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            walk(joinedPath, file + '/', results);
        } else {
            results.push(prefix + file);
        }
    }
    return results;
};

/**
 *
 */
const writePages = (pages) => {
    console.log('Writing to disk...');
    for (const filePath in pages) {
        const {content} = pages[filePath];
        const fullFilePath = DESTINATION + '/' + filePath;
        const fullFileDir = fullFilePath.replace(/[^/]*$/, '');
        fsExtra.ensureDirSync(fullFileDir);
        const fileContent = typeof content === 'string' ? content : JSON.stringify(content, null, 4);
        fs.writeFileSync(fullFilePath, fileContent);
    }
};

/**
 *
 */
const getFocusedPages = async (endpoint, focus) => {
    const isFile = focus.startsWith('File:');
    const {body} = await got(endpoint, {
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
    console.log('body: ' + JSON.stringify(body, null, 4));
    return isFile ? parseFilePages(body) : parseFilePages(body);
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pull;
