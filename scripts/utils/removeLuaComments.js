/**
 *
 */
const removeLuaComments = (luaContent) => {
    luaContent = luaContent.replace(/--\[\[[\s\S]*?]]--/g, ''); // remove block comments
    luaContent = luaContent.replace(/--.*/g, ''); // remove line  comments
    return luaContent;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = removeLuaComments;
