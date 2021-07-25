const fs = require('fs');
const ExcelJS = require('exceljs');

/**
 *
 */
const writeSheet = async (path, matrix, mutation) => {
    const jsonPath = path.replace(/[^.]*$/, 'json');
    if (fs.existsSync(path) && fs.existsSync(jsonPath)) {
        const existingContent = fs.readFileSync(jsonPath, 'utf8');
        if (existingContent === JSON.stringify(matrix, null, 4)) {
            return;
        }
    }
    const rows = matrix.length;
    const cols = matrix[0].length;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet');
    for (let y = 1; y <= rows; y++) {
        const row = sheet.getRow(y);
        for (let x = 1; x <= cols; x++) {
            const cell = row.getCell(x);
            cell.value = matrix[y - 1][x - 1];
        }
    }
    sheet.properties.rowCount = rows;
    sheet.properties.columnCount = cols;
    sheet.views = [{state: 'frozen', xSplit: 0, ySplit: 1}];
    sheet.autoFilter = {
        from: {
            row: 1,
            column: 1,
        },
        to: {
            row: rows,
            column: cols,
        },
    };
    mutation && mutation(workbook);
    await workbook.xlsx.writeFile(path);
    fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 4));
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = writeSheet;
