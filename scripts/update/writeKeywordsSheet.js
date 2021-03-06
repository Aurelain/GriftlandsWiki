const writeSheet = require('../utils/writeSheet');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const writeKeywordsSheet = async (bag) => {
    const matrix = [];
    for (const id in bag) {
        const character = bag[id];
        const row = [];
        row.push(character.name);
        row.push(character.id);
        row.push(character.desc);
        row.push(character.feature_desc);
        matrix.push(row);
    }
    matrix.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    matrix.unshift(['Name', 'Id', 'Description', 'Feature Description']);
    await writeSheet(__dirname + '/../../sheets/keywords.xlsx', matrix, sheetMutation);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const sheetMutation = (workbook) => {
    const sheet = workbook.worksheets[0]; //the first one;
    sheet.properties.defaultColWidth = 21;
    sheet.getColumn(3).width = 88;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeKeywordsSheet;
