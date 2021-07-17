/**
 *
 */
const removeUndefined = (object) => {
    for (const key in object) {
        if (object[key] === undefined) {
            delete object[key];
        }
    }
    return object;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = removeUndefined;
