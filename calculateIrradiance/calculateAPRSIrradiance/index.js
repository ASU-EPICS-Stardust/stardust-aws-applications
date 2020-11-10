const AWS = require('aws-sdk')
const got = require('got')
const {parse} = require('node-html-parser')

/**
 * Takes in an event object with a lat and a lon and goes and finds the irradiance for that location.
 * @param event
 * @param context
 * @returns {Promise<{}>}
 */

let distance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2))

exports.handler = async function(event, context) {
    // console.log("EVENT: " + JSON.stringify(event, null, 2))

    // Validate the event object
    if (!event.hasOwnProperty("lat") || !event.hasOwnProperty("lon")) {
        console.error("Event object does not contain a valid location.");
        throw "Invalid Event Object";
    }

    const currentTime = Math.floor(Date.now() / 1000);

    // Check if we have a cached value for this location
    // Cached responses will live in a DynamoDB table for a minimum of half an hour, after 30 min there is no guarantee a cached record will not be deleted
    // Requests will be cached with the lat/lon as the primary key to an accuracy of 2 decimal places
    // Cached items should not store the entire api response, but rather only the relevant irradiance params (at a minimum "ghi"). See below for the caching code.
   
    let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    const tableName = process.env.Caching_Table_Name;
    let latLonCacheKey = "lat:" + Math.round(event["lat"] * 100) / 100 + "-lon:" + Math.round(event["lon"] * 100) / 100
    let getItemParams = {
        TableName: tableName,
        Key: {
            "LatLon": {
                "S": latLonCacheKey
            }
        }
    }

    let getItemPromise = new Promise((resolve, reject) => {
        dynamodb.getItem(getItemParams, function (err, data) {
            if (err) {
                console.error(err, err.stack);
                reject(err);
            } else {
                if (data.Item) {
                    let item = AWS.DynamoDB.Converter.unmarshall(data.Item);
                    // Check that the cache item is not expired
                    if (item.ExpDate >= currentTime) {
                        // ExpDate has not been reached yet, consider valid
                        resolve(item);
                        return;
                    }
                }
                reject("No Valid Cache Item");
            }
        });
    })

	let cachedItem;
	let ghiMean;
	
    try {
        cachedItem = await getItemPromise;
    } catch (e) {
        // No Valid cached Item
        cachedItem = undefined;
    }

    if (cachedItem) {
        // Return the cached value
        ghiMean = cachedItem.CachedResponse.ghiMean;
        var source = cachedItem.Source;
        var fromCache = true;
    } else {
        // MARK: - Make the weatherbit Get request
        //TODO: Store key outside in function config

        let params = new URLSearchParams([['lat', event['lat']], ['lon', event['lon']], ['noold', '1'], ['limit', '10']]);

        let options = {
            searchParams: params,
            responseType: 'text'
        }

        let rawListResponse = await got.get("http://www.findu.com/cgi-bin/wxnear.cgi", options);

		let listResponse = parse(rawListResponse.body)

		let stationList = listResponse.querySelectorAll("a").map(el => el.innerHTML)

		ghiMean = 0

		var totalWeight = 0

		let latLongRegex = /(\d\d)(\d\d\.\d\d)([NS])\/(\d\d\d)(\d\d\.\d\d)([EW])/gm

		let luminosityRegex = /([Ll])(\d{3})/gm

		for (station of stationList) {

			let stationParams = new URLSearchParams([['call', station]])

			let stationOptions = {
				searchParams: stationParams,
				responseType: 'text'
			}

			let stationResponse = await got.get("http://www.findu.com/cgi-bin/rawwx.cgi", stationOptions)

			if (stationResponse.body.search(luminosityRegex) == -1) {
				continue
			}

			let [__, magnitudeLabel, lum] = [...stationResponse.body.matchAll(luminosityRegex)].pop()

			const luminosity = parseInt(lum) + (magnitudeLabel === "l" ? 1000 : 0)

			let [_, latDeg, latMin, latDir, lonDeg, lonMin, lonDir] = [...stationResponse.body.matchAll(latLongRegex)].pop() //Select the last line

			const stationLat = (parseFloat(latDeg) + (parseFloat(latMin) / 60)) * (latDir === "N" ? 1 : -1)
			const stationLon = (parseFloat(lonDeg) + (parseFloat(lonMin) / 60)) * (lonDir === "E" ? 1 : -1)
		

			const weight = 1.0 / distance(event['lat'], event['lon'], stationLat, stationLon)

			console.log(stationLat, stationLon, luminosity)

			ghiMean += luminosity * weight

			totalWeight += weight

		}

        // console.info("Response: " + JSON.stringify(response.body, null, 2));

        // Check the count of observations returned

        ghiMean /= totalWeight;

        source = "aprs";
        fromCache = false;

		

        // Cache the result
        let resultToCache = { // This object is the data we want to cache for later
            "ghiMean": ghiMean
        };

        let putItemParams = {
           TableName: tableName,
            Item: AWS.DynamoDB.Converter.marshall({ // Item object is the record to store in DynamoDB
                "LatLon": latLonCacheKey,
                "RequestedLat": event["lat"],
                "RequestedLon": event["lon"],
                "Source": "weatherbit",
                "CachedResponse": resultToCache,
                "RequestDate": currentTime,
                "ExpDate": (currentTime + (60 * 30)) // Set the timeout to be 30 min from now
            })
        };

        let putItemPromise = new Promise((resolve, reject) => {
            dynamodb.putItem(putItemParams, function (err, data) {
                if (err) {
                    console.error(err, err.stack);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        })

        try {
            let putItemResult = await putItemPromise;
        } catch (e) {
            // There was an error caching the event, not horrible so we can keep executing
        }
		
    }
    return {"ghi":ghiMean, "source":source, "fromCache":fromCache};
}
