/**
 * The wiki url, pointing to /api.php
 */
// const ENDPOINT = 'https://griftlands.fandom.com/api.php';
const ENDPOINT = 'http://127.0.0.1/mediawiki/api.php';

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

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = {
    ENDPOINT,
    REPLACEMENTS,
    STORAGE,
    RAW,
};
