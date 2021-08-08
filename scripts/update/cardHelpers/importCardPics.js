// noinspection HtmlRequiredAltAttribute

const assert = require('assert');
const removeLuaComments = require('../../utils/removeLuaComments');
const assertCard = require('../../utils/assertCard');
const getFilePath = require('../../utils/getFilePath');
const fs = require('fs');
const {RAW_GAME} = require('../../utils/CONFIG');
const {STORAGE} = require('../../utils/CONFIG');
const {RAW_WEB} = require('../../utils/CONFIG');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const importCardPics = (cards) => {
    let count = 0;
    for (const id in cards) {
        const cleanName = cards[id].name.split(' (card)').join('');
        const safeName = getFilePath(cleanName).replace(/\.\w+$/, '');

        const gamePic = RAW_GAME + '/cards/' + id + '.png';
        assert(fs.existsSync(gamePic), `Missing ${gamePic}!`);

        const wikiPic = RAW_WEB + '/' + safeName + '.png';
        if (fs.statSync(gamePic).size === getSize(wikiPic)) {
            continue;
        }

        console.log('safeName:', safeName);
        count++;
        fs.writeFileSync(STORAGE + '/File/' + safeName + '.png.json', '{}');
        fs.copyFileSync(gamePic, RAW_WEB + '/' + safeName + '.png');
        if (count >= 100) {
            return;
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const writeIndexHtml = (cards) => {
    let draft = '';
    for (const id in cards) {
        const safeName = getFilePath(cards[id].name).replace(/\w+$/, 'png');
        draft += `
            <tr>
                <td><img src="web/${safeName}"/></td>
                <td><img src="game/cards/${id}.png"/></td>
            </tr>`;
    }
    const html = `
    <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="utf-8"/>
                <title>Comparison</title>
                <style>
                    table {
                        border-collapse: collapse;
                    }
                    td {
                        border: solid 1px silver;
                    }
                    img {
                        width: 370px;
                        height: 542px;
                    }
                </style>
            </head>
            <body>
                <table>
                    ${draft}
                </table>
            </body>
        </html>
    `;

    const indexDir = RAW_WEB.replace(/\w+$/, '');
    fs.writeFileSync(indexDir + '/index.html', html);
};

/**
 *
 */
const getSize = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.statSync(filePath).size;
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = importCardPics;
