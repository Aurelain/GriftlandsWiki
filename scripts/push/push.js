const fs = require('fs');
const assert = require('assert').strict;
const got = require('got');
const FormData = require('form-data');
const {CookieJar} = require('tough-cookie');

const attemptSelfRun = require('../utils/attemptSelfRun');
const pull = require('../pull/pull');
const guard = require('../utils/guard');
const writeSafetyTimestamp = require('../utils/writeSafetyTimestamp');
const sleep = require('../utils/sleep');
const {ENDPOINT, CREDENTIALS, RAW_WEB, DEBUG} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const cookieJar = new CookieJar();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async (focus = '') => {
    try {
        const status = await pull(focus, true);
        if (!(await guard(status))) {
            return;
        }

        const credentials = await getCredentials();
        assert(credentials, `Invalid credentials! See "${CREDENTIALS}"`);

        const token = await getCsrfToken(credentials);
        const botPasswords = ENDPOINT.replace(/[^/]*$/, 'wiki/Special:BotPasswords');
        assert(token?.length > 2, `Could not log in!\nVisit "${botPasswords}".`);

        await writePagesToCloud(status, token);
        //await deletePagesFromCloud(token, status); // TODO: uncomment this when we have enough guards in place

        console.log('Finished push.');
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
const writePagesToCloud = async (status, token) => {
    const pending = {...status.localOnly, ...status.different};
    for (const filePath in pending) {
        const {title, content, localContent} = pending[filePath];
        if (title.startsWith('File:')) {
            await uploadImage(title, filePath, token);
        } else {
            await writeText(title, localContent || content, token);
        }
        await sleep(1000);
    }
};

/**
 *
 */
const deletePagesFromCloud = async (token, {cloudOnly}) => {
    for (const filePath in cloudOnly) {
        const {title} = cloudOnly[filePath];
        await deletePage(title, token);
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
const writeText = async (title, text, token) => {
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
        }),
        responseType: 'json',
        cookieJar,
    });
    assert(body?.edit?.result === 'Success', 'Could not write text!\n' + JSON.stringify(body, null, 4));
    const newtimestamp = body.edit.newtimestamp;
    writeSafetyTimestamp(newtimestamp);
};

/**
 *
 */
const deletePage = async (title, token) => {
    console.log(`DELETING page "${title}"...`);
    const {body} = await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'delete',
            format: 'json',
        },
        body: formalize({
            title,
            reason: 'Wikitext was missing from local storage.',
            token,
        }),
        responseType: 'json',
        cookieJar,
    });
    assert(body, JSON.stringify(body, null, 4));
};

/**
 *
 */
const uploadImage = async (title, filePath, token) => {
    const rawPath = RAW_WEB + '/' + filePath.replace('File/', '').replace(/\.[^.]*$/, '');
    assert(fs.existsSync(rawPath), `Raw file "${rawPath}" not found!`);
    console.log(`Uploading "${title}"...`);
    const {body} = await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'upload',
            format: 'json',
            ignorewarnings: true, // to allow duplicates
        },
        body: formalize({
            filename: title.replace('File:', ''),
            file: fs.createReadStream(rawPath),
            token,
        }),
        responseType: 'json',
        cookieJar,
    });
    assert(body?.upload?.result === 'Success', 'Could not upload file!\n' + JSON.stringify(body, null, 4));
    const newtimestamp = body.upload.imageinfo.timestamp;
    writeSafetyTimestamp(newtimestamp);
};

/**
 *
 */
const formalize = (bag) => {
    const form = new FormData();
    for (const key in bag) {
        form.append(key, bag[key]);
    }
    return form;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = push;
attemptSelfRun(push);
