const fs = require('fs');

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const getGrafts = () => {
    const grafts = JSON.parse(fs.readFileSync(__dirname + '/../../mods/DataExporter/output/grafts.json', 'utf8'));
    return grafts;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = getGrafts;
