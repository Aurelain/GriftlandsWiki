const fs = require('fs');
const assert = require('assert').strict;
const got = require('got');
const FormData = require('form-data');
const {CookieJar} = require('tough-cookie');
const inquirer = require('inquirer');

const attemptSelfRun = require('../utils/attemptSelfRun');
const sleep = require('../utils/sleep');
const tally = require('../utils/tally');
const getLocalContent = require('../utils/getLocalContent');
const computeSha1 = require('../utils/computeSha1');
const prettyName = require('../utils/prettyName');
const {ENDPOINT, CREDENTIALS, RAW_WEB, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const cookieJar = new CookieJar();
const ENUMERATE_SOME = 20;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async (filter = '') => {
    try {
        assert(fs.existsSync('wikiMetadata.json'), 'Use `npm run pull` first!');
        const wikiMetadata = JSON.parse(fs.readFileSync('wikiMetadata.json', 'utf8'));

        const regExpFilter = filter && new RegExp(filter);
        const candidatePages = getCandidates(new RegExp(regExpFilter), wikiMetadata);
        if (!tally(candidatePages)) {
            console.log('Nothing to push.');
            return;
        }
        if (!(await askPermission(candidatePages))) {
            return;
        }

        const credentials = await getCredentials();
        assert(credentials, `Invalid credentials! See "${CREDENTIALS}"`);

        const token = await getCsrfToken(credentials);
        const botPasswords = ENDPOINT.replace(/[^/]*$/, 'wiki/Special:BotPasswords');
        assert(token?.length > 2, `Could not log in!\nVisit "${botPasswords}".`);

        await writePagesToCloud(candidatePages, token, wikiMetadata);

        console.log('PUSH finished.');
    } catch (e) {
        console.log('Error:', e.message);
        DEBUG && console.log(e.stack);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getCandidates = (regExpFilter, wikiMetadata) => {
    const candidates = {};
    const localContent = getLocalContent(regExpFilter);
    const {pageMetadata} = wikiMetadata;
    for (const filePath in localContent) {
        const content = localContent[filePath];
        if (!pageMetadata[filePath]) {
            // This is a new file that doesn't exist online.
            candidates[filePath] = {
                content,
            };
        } else {
            const currentSha1 = computeSha1(content);
            const {sha1, revid} = pageMetadata[filePath];
            if (currentSha1 !== sha1) {
                candidates[filePath] = {
                    content,
                    revid,
                };
            }
        }
    }
    return candidates;
};

/**
 *
 */
const askPermission = async (changedPages) => {
    console.log(`You are about to write the following pages to the cloud (${tally(changedPages)}):`);
    enumerateSome(changedPages);
    const response = await inquirer.prompt({
        type: 'confirm',
        name: 'continue',
        message: 'Do you want to continue?',
        default: true,
    });
    return response.continue;
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

/**
 *
 */
const writePagesToCloud = async (candidatePages, token, wikiMetadata) => {
    const withSleep = tally(candidatePages) > 1;
    for (const filePath in candidatePages) {
        const {content, revid} = candidatePages[filePath];
        const title = prettyName(filePath).replace(/\.[^.]*$/, '');
        let freshMetaEntry;
        if (title.match(/^File\b/)) {
            freshMetaEntry = await uploadImage(title, filePath, token);
        } else {
            freshMetaEntry = await writeText(title, content, token, revid);
        }
        freshMetaEntry && injectIntoMetadata(filePath, freshMetaEntry, wikiMetadata);
        withSleep && (await sleep(1000));
    }
};

/**
 *
 */
const getCredentials = () => {
    let credentials;
    try {
        return JSON.parse(fs.readFileSync(CREDENTIALS, 'utf8'));
    } catch (e) {
        credentials = {username: '', password: ''};
        fs.writeFileSync(CREDENTIALS, JSON.stringify(credentials, null, 4));
    }
    return credentials.password && credentials.password ? credentials : null;
};

/**
 * We prefer not to use the `mediawiki` package as audit says it has several vulnerabilities... and it doesn't work.
 * Adapted from code examples at https://www.mediawiki.org/wiki/API:Edit
 */
const getCsrfToken = async ({username, password}) => {
    // Step 1: GET request to fetch login token
    const loginTokenResponse = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            meta: 'tokens',
            type: 'login',
        },
        responseType: 'json',
        cookieJar,
    });
    const {logintoken} = loginTokenResponse.body.query.tokens;

    // Step 2: POST request to log in.
    await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'login',
            format: 'json',
            lgname: username,
        },
        body: formalize({
            lgpassword: password,
            lgtoken: logintoken,
        }),
        responseType: 'json',
        cookieJar,
    });

    // Step 3: GET request to fetch CSRF token
    const response = await got(ENDPOINT, {
        method: 'get',
        searchParams: {
            action: 'query',
            format: 'json',
            meta: 'tokens',
        },
        responseType: 'json',
        cookieJar,
    });
    const {csrftoken} = response.body.query.tokens;
    return csrftoken;
};

/**
 *
 */
const writeText = async (title, text, token, revid) => {
    console.log(`Writing text page "${title}"...`);
    const {body} = await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'edit',
            format: 'json',
        },
        body: formalize({
            title,
            text,
            token,
            baserevid: revid,
        }),
        responseType: 'json',
        cookieJar,
    });
    assert(body?.edit?.result === 'Success', 'Could not write text!\n' + JSON.stringify(body, null, 4));
    const newrevid = body.edit.newrevid;
    return {
        content: text,
        revid: newrevid,
    };
};

/**
 *
 */
const uploadImage = async (title, filePath, token) => {
    const rawPath = RAW_WEB + '/' + filePath.replace(/^File./, '').replace(/\.[^.]*$/, '');
    assert(fs.existsSync(rawPath), `Raw file "${rawPath}" not found!`);
    const safeFileName = title.replace(/^File./, '').replace(/:/g, ''); // "Weakness: Slow" gets its colon removed
    console.log(`Uploading "${safeFileName}"...`);
    const {body} = await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'upload',
            format: 'json',
            ignorewarnings: true, // to allow duplicates
        },
        body: formalize({
            filename: safeFileName,
            file: fs.createReadStream(rawPath),
            token,
        }),
        responseType: 'json',
        cookieJar,
    });
    // console.log('body: ' + JSON.stringify(body, null, 4));
    assert(body?.upload?.result === 'Success', 'Could not upload file!\n' + JSON.stringify(body, null, 4));
    return null; // TODO: write the revid and the new file content!
};

/**
 *
 */
const formalize = (bag) => {
    const form = new FormData();
    for (const key in bag) {
        if (bag[key] !== undefined) {
            form.append(key, bag[key]);
        }
    }
    return form;
};

/**
 *
 */
const injectIntoMetadata = (filePath, entry, wikiMetadata) => {
    wikiMetadata.pageMetadata[filePath] = {
        sha1: computeSha1(entry.content),
        revid: entry.revid,
    };
    fs.writeFileSync('wikiMetadata.json', JSON.stringify(wikiMetadata, null, 4));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = push;
attemptSelfRun(push);
