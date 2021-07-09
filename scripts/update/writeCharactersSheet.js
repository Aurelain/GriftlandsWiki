const fs = require('fs');

const writeSheet = require('../utils/writeSheet');
const {RAW_WEB} = require('../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const writeCharactersSheet = async (list) => {
    const matrix = [];
    for (const character of list) {
        const row = [];
        row.push(character.name);
        row.push(character.title);
        row.push(character.faction_id);
        row.push(character.bio);
        row.push(character.loved_graft);
        row.push(character.hated_graft);
        row.push(character.death_item);
        row.push(character.species);
        row.push(Boolean(character.boss));
        row.push(character.uuid);
        matrix.push(row);
    }
    matrix.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    for (const row of matrix) {
        const name = row[0];
        if (!fs.existsSync(RAW_WEB + '/' + name + '_portrait.png')) {
            console.log(`Missing portrait for ${name}!`);
        }
    }

    matrix.unshift(['Name', 'Title', 'Faction', 'Bio', 'Love', 'Hate', 'Death', 'Species', 'Boss', 'Uuid']);
    await writeSheet(__dirname + '/../../sheets/characters.xlsx', matrix, sheetMutation);
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
    sheet.getColumn(4).width = 88;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeCharactersSheet;
