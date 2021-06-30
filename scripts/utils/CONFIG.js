const {resolve} = require('path');

/**
 * The wiki url, pointing to /api.php
 */
const ENDPOINT = 'https://griftlands.fandom.com/api.php';
// const ENDPOINT = 'http://127.0.0.1/mediawiki/api.php';

/**
 * Authentication information, obtained from `Special:BotPasswords`, needed by `push`.
 */
const CREDENTIALS = resolve(__dirname + '/credentials.json');
// const CREDENTIALS = resolve(__dirname + '/credentials_local.json');

/**
 * A file name (in the local OS file system) cannot contain some special characters, so we replace them.
 * Besides those, we're also replacing SPACE with UNDERSCORE.
 */
const REPLACEMENTS = {
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
 * Directory where we store the pulled pages.
 */
const STORAGE = __dirname + '/../../wiki';

/**
 * Directory where we store the images that correspond to each json in the "File" folder.
 */
const RAW = __dirname + '/../../raw/web';

/**
 * A flag for verbosity.
 */
const DEBUG = true;

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = {
    ENDPOINT,
    CREDENTIALS,
    REPLACEMENTS,
    STORAGE,
    RAW,
    DEBUG,
};
