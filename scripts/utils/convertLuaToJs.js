const toBase64 = require('./toBase64');
const fromBase64 = require('./fromBase64');

/**
 *
 */
const convertLuaToJs = (lua) => {
    lua = lua.replace(/(")([^"]*)(")/g, hideTexts);
    lua = lua.replace(/(\[\[)([\s\S]*?)(]])/g, hideTexts); // ai_negotiation quips

    lua = lua.replace(/\bfunction\b([^)]*)\)/g, 'function$1){');
    lua = lua.replace(/\bfor\b([\s\S]*?)\bdo\b/g, 'for ($1) {');
    lua = lua.replace(/\bwhile\b([\s\S]*?)\bdo\b/g, 'while ($1) {');
    lua = lua.replace(/\bif\b([\s\S]*?)\bthen\b/g, 'if ($1) {');
    lua = lua.replace(/\belseif\b([\s\S]*?)\bthen\b/g, '} else if ($1) {');
    lua = lua.replace(/\belse\b/g, '} else {');
    lua = lua.replace(/\bend\b/g, '}');

    lua = lua.replace(/(")([^"]*)(")/g, restoreTexts);
    lua = lua.replace(/(\[\[)([\s\S]*?)(]])/g, restoreTexts);

    return lua;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const hideTexts = (found, prefix, inner, suffix) => {
    return prefix + toBase64(inner) + suffix;
};

/**
 *
 */
const restoreTexts = (found, prefix, inner, suffix) => {
    return prefix + fromBase64(inner) + suffix;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = convertLuaToJs;
