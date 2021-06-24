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
const TEXTS_SOURCE = __dirname + '/../../wiki';

/**
 * The file extension we use when storing texts.
 */
const TEXT_EXTENSION = 'wikitext'; // could also be "txt"

/**
 * Directory where we store the images.
 */
const RAW_SOURCE = __dirname + '/../../raw/web';

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


// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const push = async () => {};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const getAllInterestingPages = async () => {};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = push;
