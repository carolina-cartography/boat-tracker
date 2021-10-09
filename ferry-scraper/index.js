const Puppeteer = require('puppeteer')

const URL = "https://www.puertoricoferry.com/en/routes-schedules/ceiba-vieques/"

async function scrape() {

    // Initialize placeholder for ferry data
    let metadata;

    // Get data using Puppeteer
    try {

        // Initialize a Puppeteer instance
        console.log("Initializing...")
        const browser = await Puppeteer.launch()
        const page = await browser.newPage()

        // Go to page
        console.log("Loading page...")
        await page.goto(URL)

        // Wait for Hornblower GraphQL request response
        console.log("Waiting for GraphQL responses...")
        await page.waitForResponse(async res => {

            // Filter responses for Hownblower GraphQL
            if (res.url().includes("my.hornblower.com/graphql")) {
                let json = await res.json()

                // When TicketAvailability response is received, save and exit
                if (json.data && json.data.ticketAvailabilityV2) {
                    console.log('GraphQL data downloaded!')
                    metadata = json.data.ticketAvailabilityV2
                    return true
                }
            }
        })
    } catch(err) {
        console.error(err)
        process.exit(1)
    }

    // Get required stop IDs
    let viequesStopID, ceibaStopID
    for (let stop of metadata.stops) {
        if (stop.name === "Vieques") {
            viequesStopID = stop.id
        }
        if (stop.name === "Ceiba") {
            ceibaStopID = stop.id
        }
    }

    // Iterate through trips
    let formattedTrips = []
    for (let trip of metadata.ticketAvailability) {
        if (
            trip.fromStopId === viequesStopID && trip.toStopId === ceibaStopID ||
            trip.fromStopId === ceibaStopID && trip.toStopId === viequesStopID
        ) {
            let formattedTrip = {
                direction: trip.fromStopId === ceibaStopID ? 'inbound' : 'outbound',
                date: trip.StartDate,
                boardingTime: trip.boardingTime,
                startTime: trip.eventTimes.startTime,
                endTime: trip.eventTimes.endTime,
                vessel: trip.tourResources[0] !== undefined ? trip.tourResources[0].ResourceName : null,
            }
            formattedTrips.push(formattedTrip)
        }
    }

    // TODO: Upload formatted trips to MongoDB
    
    console.log("Scrape complete!")
    process.exit(0)
}

scrape()