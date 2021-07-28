/**
 *
 */
const convertLuaToJs = (lua) => {
    lua = lua.replace(/\bfor (.*?) do([\r\n])/g, 'for ($1) {$2');
    lua = lua.replace(/\bif (.*?) then([\r\n])/g, 'if ($1) {$2');
    lua = lua.replace(/\belseif (.*?) then([\r\n])/g, '} else if ($1) {$2');
    lua = lua.replace(/\belse([\r\n])/g, '} else {$1');
    lua = lua.replace(/\bend([\r\n]?)/g, '}$1');
    return lua;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = convertLuaToJs;
