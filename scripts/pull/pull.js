const fs = require('fs');
const assert = require('assert').strict;
const fsExtra = require('fs-extra');
const got = require('got');
const tally = require('../utils/tally');

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
 * @returns {Promise<{}>}
 */
const pull = async (endpoint = ENDPOINT, ethereal = false) => {
    try {
        const pages = await getAllInterestingPages(endpoint);

        const modifiedPages = inspectPages(pages);
        console.log('Modified pages and files:', tally(modifiedPages));

        if (!ethereal) {
            writePages(modifiedPages);
            // removeOrphanPages(pages);
        }
        return modifiedPages;
    } catch (e) {
        console.log('Error:', e.message);
        // console.log(e.stack);
    }
    console.log('Done.');
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
    console.log(`All pages: ${tally(pages)}.`);
    const files = await getAllFiles(endpoint);
    Object.assign(pages, files);
    console.log(`All images: ${tally(files)}.`);
    return pages;
};

/**
 *
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
 * [
 *      {
 *          title: 'Category:Foo Bar!/doc',
 *          dir: 'Category',
 *          fileName: 'Foo_Bar!%2Fdoc',
 *          type: 'text', // always "text"
 *          content: 'hello',
 *      },
 *      ...
 * ]
 */
const getSomeTextsFromNamespace = async (endpoint, ns, continuation) => {
    console.log('Getting texts...');
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
    const pages = body?.query?.pages;
    assert(pages, 'No pages!');

    const bag = {};
    for (const key in pages) {
        const {title, revisions} = pages[key];
        const text = revisions?.[0].slots?.main?.['*'];
        assert(text, `Invalid revisions for "${JSON.stringify(pages[key])}"`);
        bag[title] = buildTextEntry(title, text);
    }
    return {
        pages: bag,
        continuation: body.continue?.gapcontinue,
    };
};

/**
 *
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
 * [
 *      {
 *          title: 'File:Foo.png',
 *          dir: 'File', // always "File"
 *          fileName: 'Foo.png',
 *          type: 'file', // always "file"
 *          content: {
 *              url: 'https://...',
 *              sha1: '6002cb288b241fcc89353ce43fbb745ac9fd322c',
 *          },
 *      },
 *      ...
 * ]
 */
const getSomeFiles = async (endpoint, continuation) => {
    console.log('Getting images...');
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
        },
        responseType: 'json',
    });
    const {body} = gotSomeFiles;
    const pages = body?.query?.pages;
    assert(pages, 'No pages!');

    const bag = {};
    for (const key in pages) {
        const {title, imageinfo} = pages[key];
        assert('imageinfo', 'No image info!');
        bag[title] = await buildImageEntry(title, imageinfo);
    }
    return {
        pages: bag,
        continuation: body.continue?.gapcontinue,
    };
};

/**
 *
 */
const buildTextEntry = (title, content) => {
    const dir = (title.match(/^([^:]+):/) || [null, ''])[1];
    const actualTitle = dir ? title.substr(dir.length + 1) : title;
    const fileName = sanitizeNameForFileSystem(actualTitle);
    return {
        title,
        dir,
        fileName,
        type: 'text',
        content,
    };
};

/**
 *
 */
const buildImageEntry = async (title, imageinfo) => {
    const dir = (title.match(/^([^:]+):/) || [null, ''])[1];
    const actualTitle = dir ? title.substr(dir.length + 1) : title;
    const fileName = sanitizeNameForFileSystem(actualTitle);
    const {url, sha1} = imageinfo[0];
    assert(url && sha1, 'Invalid image info!');
    return {
        title,
        dir,
        fileName,
        type: 'file',
        content: {
            url,
            sha1,
        },
    };
};

/**
 *
 */
const sanitizeNameForFileSystem = (name) => {
    for (const c in TITLE_REPLACEMENTS) {
        name = name.split(c).join(TITLE_REPLACEMENTS[c]);
    }
    return name;
};

/**
 *
 */
const inspectPages = (pages) => {
    const output = {};
    for (const title in pages) {
        const {dir, fileName, content, type} = pages[title];
        const destinationDir = dir ? DESTINATION + '/' + dir : DESTINATION;
        let existingContent;
        try {
            if (type === 'text') {
                existingContent = fs.readFileSync(destinationDir + '/' + fileName + '.' + TEXT_EXTENSION, 'utf8');
            } else {
                const name = destinationDir + '/' + fileName + '.json';
                existingContent = fs.readFileSync(name, 'utf8');
            }
        } catch (e) {}
        if (existingContent !== content) {
            output[title] = pages[title];
        }
    }
    return output;
};

/**
 *
 */
const writePages = (pages) => {
    console.log('Writing to disk...');
    for (const title in pages) {
        const {dir, fileName, content, type} = pages[title];
        const destinationDir = dir ? DESTINATION + '/' + dir : DESTINATION;
        fsExtra.ensureDirSync(destinationDir);
        if (type === 'text') {
            fs.writeFileSync(destinationDir + '/' + fileName + '.' + TEXT_EXTENSION, content);
        } else {
            const name = destinationDir + '/' + fileName + '.json';
            fs.writeFileSync(name, JSON.stringify(content, null, 4));
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pull;
