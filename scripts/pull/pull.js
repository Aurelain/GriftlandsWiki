const fs = require('fs');
const fsExtra = require('fs-extra');
const axios = require('axios');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const WIKI_URL = 'https://griftlands.fandom.com';
// const WIKI_URL = 'http://localhost/mediawiki';

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
const TEXT_NAMESPACES = [0, 8, 10, 14];
const FILES_NAMESPACE = 6;

/**
 * A list of title patterns that will be skipped.
 */
const BLACKLIST = [
    /*/Clearyourcache/*/
];

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
 * @param ethereal      If `true`, the results will not be persisted (the disk will not be touched).
 * @returns {Promise<{}>}
 */
const pull = async (ethereal = false) => {
    const pages = await getAllInterestingPages();
    // console.log('pages: ' + JSON.stringify(pages, null, 4));
    if (!ethereal) {
        writePages(pages);
        // removeOrphanPages(pages);
    }
    return pages;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getAllInterestingPages = async () => {
    const pages = {};
    for (const ns of TEXT_NAMESPACES) {
        const results = await getAllTextsFromNamespace(ns);
        Object.assign(pages, results);
    }
    const files = await getAllFiles();
    Object.assign(pages, files);
    return pages;
};

/**
 *
 */
const getAllTextsFromNamespace = async (ns) => {
    let continuation = '';
    const output = {};
    let i = 0;
    while (true) {
        i++;
        const result = await getSomeTextsFromNamespace(ns, continuation);
        if (!result) {
            return null;
        }
        Object.assign(output, result.pages);
        continuation = result.continuation;
        if (!continuation || i >= LOOP_LIMIT) {
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
const getSomeTextsFromNamespace = async (ns, continuation) => {
    const url =
        WIKI_URL +
        '/api.php' +
        '?action=query' +
        '&prop=revisions' + // revisions
        '&rvprop=content' +
        '&rvslots=main' +
        '&generator=allpages' + // generator
        `&gapnamespace=${ns}` +
        `&gaplimit=${API_LIMIT}` +
        (continuation ? `&gapcontinue=${continuation}` : '') +
        '&format=json';
    console.log('getSomeTextsFromNamespace:', url);

    const {data} = await axios.get(url);
    // console.log('data: ' + JSON.stringify(data, null, 4));
    if (!data?.query) {
        return null;
    }
    const bag = {};
    const {pages} = data.query;
    for (const key in pages) {
        const {title, revisions} = pages[key];
        if (isAllowed(title)) {
            bag[title] = buildTextEntry(title, revisions[0].slots.main['*']);
        }
    }
    return {
        pages: bag,
        continuation: data.continue?.gapcontinue,
    };
};

/**
 *
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
        if (!continuation || i >= LOOP_LIMIT) {
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
const getSomeFiles = async (continuation) => {
    const url =
        WIKI_URL +
        '/api.php' +
        '?action=query' +
        '&prop=imageinfo' +
        '&iiprop=url|sha1' +
        '&generator=allpages' + // generator
        `&gapnamespace=${FILES_NAMESPACE}` +
        `&gaplimit=max` + // max is accepted here, as opposed to texts
        (continuation ? `&gapcontinue=${continuation}` : '') +
        '&format=json';
    console.log('getSomeFiles:', url);

    const {data} = await axios.get(url);
    // console.log('data: ' + JSON.stringify(data, null, 4));
    if (!data?.query) {
        return null;
    }
    const bag = {};
    const {pages} = data.query;
    console.log('count: ' + Object.keys(pages).length);
    for (const key in pages) {
        const {title, imageinfo} = pages[key];
        if (isAllowed(title)) {
            bag[title] = await buildImageEntry(title, imageinfo);
        }
    }
    return {
        pages: bag,
        continuation: data.continue?.gapcontinue,
    };
};

/**
 *
 */
const isAllowed = (title) => {
    for (const pattern of BLACKLIST) {
        if (title.match(pattern)) {
            return false;
        }
    }
    return true;
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
const writePages = (pages) => {
    for (const title in pages) {
        const {dir, fileName, content, type} = pages[title];
        const destination = dir ? DESTINATION + '/' + dir : DESTINATION;
        fsExtra.ensureDirSync(destination);
        if (type === 'text') {
            fs.writeFileSync(destination + '/' + fileName + '.' + TEXT_EXTENSION, content);
        } else {
            const name = destination + '/' + fileName + '.json';
            fs.writeFileSync(name, JSON.stringify(content, null, 4));
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = pull;