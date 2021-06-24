const fs = require('fs');
const {resolve, join} = require('path');
const got = require('got');
const FormData = require('form-data');
const {CookieJar} = require('tough-cookie');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
// const ENDPOINT = 'https://griftlands.fandom.com/api.php';
const ENDPOINT = 'http://127.0.0.1/mediawiki/api.php';

/**
 * Directory where we store the pulled pages.
 */
const PAGES_DIR = __dirname + '/../../wiki';

/**
 * The file extension we use when storing texts.
 */
const TEXT_EXTENSION = 'wikitext'; // could also be "txt"

/**
 * Directory where we store the images that correspond to each json in the "File" folder.
 */
const RAW_DIR = __dirname + '/../../raw/web';

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

const credentialsPath = resolve(__dirname + '/credentials.json');

const cookieJar = new CookieJar();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async () => {
    const credentials = await getCredentials();
    if (!credentials) {
        console.log(`Invalid credentials! See "${credentialsPath}"`);
        return;
    }
    const token = await getCsrfToken(credentials);
    if (!token) {
        console.log(`Could not log in!`);
        console.log(`Visit "https://griftlands.fandom.com/wiki/Special:BotPasswords".`);
        return;
    }
    const pages = prepare(PAGES_DIR);
    for (let i = 570; i < pages.length; i++) {
        const {title, text} = pages[i];
        const result = await writePage(title, text, token);
        console.log(i, result ? '✓' : '✕', title);
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
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
const formalize = (bag) => {
    const form = new FormData();
    for (const key in bag) {
        form.append(key, bag[key]);
    }
    return form;
};

/**
 *
 */
const prepare = (dir, results = [], namespace = '') => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file === 'File') {
            continue;
        }
        const joinedPath = join(dir, file);
        const stat = fs.statSync(joinedPath);
        if (stat && stat.isDirectory()) {
            prepare(joinedPath, results, file);
        } else {
            results.push({
                title: prepareTitle(file, namespace),
                text: fs.readFileSync(joinedPath, 'utf8'),
            });
        }
    }
    return results;
};

/**
 *
 */
const prepareTitle = (fileName, namespace) => {
    let title = fileName.replace(/\.[^.]*$/, '');
    for (const unsafe in TITLE_REPLACEMENTS) {
        const safe = TITLE_REPLACEMENTS[unsafe];
        title = title.split(safe).join(unsafe);
    }
    return namespace ? `${namespace}:${title}` : title;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = push;
