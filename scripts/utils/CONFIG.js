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
 * Installation directory, which should contain the game archives ("data_scripts.zip" and others).
 */
const GAME_DIR = 'C:/Program Files (x86)/Steam/steamapps/common/Griftlands';

/**
 * Directory where we store the pulled pages.
 */
const STORAGE = __dirname + '/../../wiki';

/**
 * Directory where we store the images that correspond to each json in the "File" folder.
 */
const RAW_WEB = __dirname + '/../../raw/web';

/**
 * Directory where we store assets extracted (datamined) from the game.
 */
const RAW_GAME = __dirname + '/../../raw/game';

/**
 * A flag for verbosity.
 */
const DEBUG = false;

/**
 * The location of a file containing the latest pulled or pushed timestamp of the online wiki.
 */
const SAFETY_TIMESTAMP_PATH = __dirname + '/safetyTimestamp.txt';

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = {
    ENDPOINT,
    CREDENTIALS,
    REPLACEMENTS,
    GAME_DIR,
    STORAGE,
    RAW_WEB,
    RAW_GAME,
    DEBUG,
    SAFETY_TIMESTAMP_PATH,
};
