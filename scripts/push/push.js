const fs = require('fs');
const assert = require('assert').strict;
const {resolve} = require('path');
const got = require('got');
const FormData = require('form-data');
const {CookieJar} = require('tough-cookie');
const pull = require('../pull/pull');
const guardPull = require('./guardPull');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
// const ENDPOINT = 'https://griftlands.fandom.com/api.php';
const ENDPOINT = 'http://127.0.0.1/mediawiki/api.php';

/**
 * Directory where we store the images that correspond to each json in the "File" folder.
 */
const RAW_DIR = __dirname + '/../../raw/web';

const credentialsPath = resolve(__dirname + '/credentials.json');

const cookieJar = new CookieJar();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async (endpoint = ENDPOINT) => {
    try {
        const status = await pull(endpoint, true);
        await guardPull(status);

        const credentials = await getCredentials();
        assert(credentials, `Invalid credentials! See "${credentialsPath}"`);

        const token = await getCsrfToken(endpoint, credentials);
        assert(token, `Could not log in!\nVisit "https://griftlands.fandom.com/wiki/Special:BotPasswords".`);

        // await writePagesToCloud(endpoint, token, status);
        // await deletePagesFromCloud(endpoint, token, status)

        console.log('Finished push.');
    } catch (e) {
        console.log('Error:', e.message);
        // console.log(e.stack);
    }

    const {different, localOnly} = await pull(endpoint, true);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const writePagesToCloud = async (endpoint, token, status) => {
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
const getCsrfToken = async (endpoint, {username, password}) => {
    // Step 1: GET request to fetch login token
    const loginTokenResponse = await got(endpoint, {
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
    await got(endpoint, {
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
    const response = await got(endpoint, {
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
const writePage = async (endpoint, title, text, token) => {
    const writeResponse = await got(endpoint, {
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
