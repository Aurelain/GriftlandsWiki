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
const writeCardsSheet = async (bag, name = 'cards') => {
    const matrix = [];
    for (const id in bag) {
        const card = bag[id];
        const row = [];
        row.push(card.name);
        row.push(id);
        row.push(card.desc || ' ');
        row.push(card.character || ' ');
        row.push(card.deckType || ' ');
        row.push(card.cardType || ' ');
        row.push(card.keywords || ' ');
        row.push(card.flavour || ' ');
        row.push(card.rarity || ' ');
        row.push(card.parent || ' ');
        row.push(card.upgrades || ' ');
        row.push(card.cost || ' ');
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
        'Name',
        'Id',
        'Description',
        'Character',
        'DeckType',
        'CardType',
        'Keywords',
        'Flavour',
        'Rarity',
        'Parent',
        'Upgrades',
        'Cost',
        'Xp',
        'Min',
        'Max',
    ]);
    await writeSheet(__dirname + '/../../sheets/' + name + '.xlsx', matrix, sheetMutation);
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
    sheet.getColumn(1).width = 20; // Name
    sheet.getColumn(3).width = 80; // Description
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeCardsSheet;
