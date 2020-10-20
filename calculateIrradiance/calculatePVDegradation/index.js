const AWS = require('aws-sdk')

/**
 * Takes in an event specifying details on a panel and computes the degradation. Will log this result in a dynamo table as well.
 * @param event {{panelIrradiance: number, }}
 * @param context {}
 * @returns {Promise<{degradation: number}>}
 */
exports.handler = async function(event, context) {

    // Grab lat and lon and go get irradiance
    const e_now = event['panelIrradiance'];
    const p_max = event['pMax'];
    const p_out = event['pOut'];
    const e_std = event['stdIrradiance'];

    // Compute 1- (P_out * E_std) / (P_max * E_now)
    const degradation = 1 - ((p_out * e_std) / (p_max * e_now));

    //TODO: Store test in table

    return {"degradation": degradation};

}
