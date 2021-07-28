const obfuscateLuaTexts = require('./obfuscateLuaTexts');
const restoreLuaTexts = require('./restoreLuaTexts');

/**
 *
 */
const convertLuaToJs = (lua) => {
    lua = lua.replace(/\[\[([\s\S]*?)]]/g, multilineReplacer); // "ai_negotiation" quips

    lua = obfuscateLuaTexts(lua);

    lua = lua.replace(/\bnot\b\s*/g, '!');
    lua = lua.replace(/\bnil\b/g, 'null');
    lua = lua.replace(/\bfunction\b([^)]*)\)/g, 'function$1){');
    lua = lua.replace(/\bfor\b([\s\S]*?)\bdo\b/g, 'for ($1) {');
    lua = lua.replace(/\bwhile\b([\s\S]*?)\bdo\b/g, 'while ($1) {');
    lua = lua.replace(/\bif\b([\s\S]*?)\bthen\b/g, 'if ($1) {');
    lua = lua.replace(/\belse\b/g, '} else {');
    lua = lua.replace(/\belseif\b([\s\S]*?)\bthen\b/g, '} else if ($1) {');
    lua = lua.replace(/\bend\b/g, '}');

    lua = restoreLuaTexts(lua);

    return lua;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const multilineReplacer = (found, inside) => {
    return '"' + inside.replace(/[\r\n]+/g, ' ') + '"';
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = convertLuaToJs;
