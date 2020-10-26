const AWS = require('aws-sdk')
const got = require('got')

/**
 * Takes in an event object with a lat and a lon and goes and finds the irradiance for that location.
 * @param event
 * @param context
 * @returns {Promise<{}>}
 */
exports.handler = async function(event, context) {
    // console.log("EVENT: " + JSON.stringify(event, null, 2))

    // Validate the event object
    if (!event.hasOwnProperty("lat") || !event.hasOwnProperty("lon")) {
        console.error("Event object does not contain a valid location.");
        throw "Invalid Event Object";
    }

    // Make the weatherbit request
    //TODO: Store key outside in function config
    let apiKey = "785160d6e77043b69f6bacabe15921c1"; // This is currently Aaron's personal key

    let params = new URLSearchParams([['lat', event['lat']], ['lon', event['lon']], ['key', apiKey]]);

    let options = {
        searchParams: params,
        responseType: 'json'
    }

    const response = await got.post("http://api.weatherbit.io/v2.0/current", options);

    // console.info("Response: " + JSON.stringify(response.body, null, 2));

    // Check the count of observations returned
    let count = response.body.count;

    let ghiMean = 0;

    response.body.data.forEach(function (data) {
        ghiMean += data.ghi;
    })

    ghiMean /= count;

    return {"ghi":ghiMean};
}