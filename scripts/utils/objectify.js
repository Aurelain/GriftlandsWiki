/**
 *
 */
const objectify = (list, byKey = null, useIndex = false) => {
    const object = {};
    if (byKey === null) {
        const len = list.length;
        for (let i = 0; i < len; i++) {
            object[list[i]] = i;
        }
    } else {
        const len = list.length;
        for (let i = 0; i < len; i++) {
            const item = list[i];
            object[item[byKey]] = useIndex ? i : item;
        }
    }
    return object;
};

module.exports = objectify;
