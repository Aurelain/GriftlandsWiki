const fs = require('fs');
const assert = require('assert').strict;
const {resolve} = require('path');
const got = require('got');
const FormData = require('form-data');
const {CookieJar} = require('tough-cookie');

const pull = require('../pull/pull');
const guard = require('../utils/guard');
const {ENDPOINT, RAW} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const credentialsPath = resolve(__dirname + '/credentials.json');

const cookieJar = new CookieJar();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async (focus = 'File:Adapt.png') => {
    try {
        const status = await pull(true, focus);
        if (!(await guard(status))) {
            return;
        }

        const credentials = await getCredentials();
        assert(credentials, `Invalid credentials! See "${credentialsPath}"`);

        const token = await getCsrfToken(credentials);
        assert(token, `Could not log in!\nVisit "https://griftlands.fandom.com/wiki/Special:BotPasswords".`);

        await writePagesToCloud(status, token);
        // await deletePagesFromCloud(endpoint, token, status)

        console.log('Finished push.');
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
const writePagesToCloud = async (status, token) => {
    const pending = {...status.localOnly, ...status.different};
    for (const filePath in pending) {
        const {title, content} = pending[filePath];
        if (title.startsWith('File:')) {
            await uploadImage(title, filePath, token);
        }
        console.log('filePath:', filePath);
    }
    // const pages = prepare(PAGES_DIR);
    // for (let i = 570; i < pages.length; i++) {
    //     const {title, text} = pages[i];
    //     const result = await writePage(endpoint, title, text, token);
    //     console.log(i, result ? '✓' : '✕', title);
    // }
};

/**
 *
 */
const deletePagesFromCloud = async (endpoint, token, status) => {
    // const pages = prepare(PAGES_DIR);
    // for (let i = 570; i < pages.length; i++) {
    //     const {title, text} = pages[i];
    //     const result = await writePage(endpoint, title, text, token);
    //     console.log(i, result ? '✓' : '✕', title);
    // }
};

/**
 *
 */
const getCredentials = () => {
    let credentials;
    try {
        return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    } catch (e) {
        credentials = {username: '', password: ''};
        fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 4));
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
const writePage = async (title, text, token) => {
    const writeResponse = await got(ENDPOINT, {
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
    const result = writeResponse?.body?.edit?.result === 'Success';
    if (!result) {
        console.log('writeResponse:', writeResponse.body);
        process.exit(0);
    }
    return result;
};

/**
 *
 */
const uploadImage = async (title, filePath, token) => {
    console.log('filePath:', filePath);
    const rawPath = RAW + '/' + filePath.replace('File/', '').replace(/\.[^.]*$/, '');
    console.log('rawPath:', rawPath);
    const {body} = await got(ENDPOINT, {
        method: 'post',
        searchParams: {
            action: 'upload',
            format: 'json',
        },
        body: formalize({
            filename: title.replace('File:', ''),
            file: fs.createReadStream(rawPath),
            token,
        }),
        responseType: 'json',
        cookieJar,
    });
    console.log('body', body);
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
