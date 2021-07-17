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
const writeCardsSheet = async (bag) => {
    const matrix = [];
    for (const id in bag) {
        const card = bag[id];
        const row = [];
        row.push(id);
        row.push(card.name);
        row.push(card.desc);
        row.push(card.flavour);
        row.push(card.rarity);
        row.push(card.parent);
        row.push(card.upgrade1);
        row.push(card.upgrade2);
        row.push(card.upgrade3);
        row.push(card.upgrade4);
        row.push(card.upgrade5);
        row.push(card.upgrade6);
        row.push(card.upgrade7);
        row.push(card.upgrade8);
        row.push(card.upgrade9);
        row.push(card.upgrade10);
        row.push(card.cost);
        row.push(card.xp);
        row.push(card.minDamage);
        row.push(card.maxDamage);
        matrix.push(row);
    }
    matrix.sort((a, b) => (a[0] < b[0] ? -1 : 1));

    // for (const row of matrix) {
    //     const name = row[0];
    //     if (!fs.existsSync(RAW_WEB + '/' + name + '_portrait.png')) {
    //         console.log(`Missing portrait for ${name}!`);
    //     }
    // }

    matrix.unshift([
        'Id',
        'Name',
        'Description',
        'Flavour',
        'Rarity',
        'Parent',
        'Up1',
        'Up2',
        'Up3',
        'Up4',
        'Up5',
        'Up6',
        'Up7',
        'Up8',
        'Up9',
        'Up10',
        'Cost',
        'Xp',
        'Min',
        'Max',
    ]);
    await writeSheet(__dirname + '/../../sheets/cards.xlsx', matrix, sheetMutation);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const sheetMutation = (workbook) => {
    const sheet = workbook.worksheets[0]; //the first one;
    sheet.properties.defaultColWidth = 7;
    sheet.getColumn(2).width = 20;
    sheet.getColumn(3).width = 80;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeCardsSheet;
