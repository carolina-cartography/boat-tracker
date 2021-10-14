const Puppeteer = require('puppeteer-core')
const { MongoClient } = require("mongodb")

const URL = "https://www.puertoricoferry.com/en/routes-schedules/ceiba-vieques/"

// Validate environment variables
const req_env = ["PUPPETEER_EXEC_PATH", "MONGO_HOST", "MONGO_NAME", "MONGO_USER", "MONGO_PASS"]
for (let env of req_env) if (process.env[env] === undefined) throw(`Enviornment variable ${env} is required`)

let mongoClient, db
function mongoConnect() {
    return new Promise((resolve, reject) => {
        console.log("Connecting to database...")
        mongoClient = new MongoClient(
            `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/${process.env.MONGO_NAME}`
        )
        mongoClient.connect((err) => {
            if (err) throw(err)
            db = mongoClient.db(process.env.MONGO_DB)
            console.log("Connected to database!")
            resolve()
        })
    })
}
function mongoInsert(doc) {
    return new Promise((resolve, reject) => {
        console.log("Inserting document...")
        db.collection("trips").insertOne(doc).then(result => {
            console.log("Document inserted")
            resolve()
        }).catch(err => {
            console.error(err)
            resolve() // Don't reject on error for now
        })
    })
}

async function scrape() {

    // Initialize placeholder for ferry data
    let metadata;

    // Get data using Puppeteer
    try {

        // Initialize a Puppeteer instance
        console.log("Initializing...")
        const browser = await Puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXEC_PATH,
            args: ['--no-sandbox', '--disable-gpu']
        })
        const page = await browser.newPage()

        // Go to page
        console.log("Loading page...")
        await page.setDefaultNavigationTimeout(90000)
        page.goto(URL)

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
        }, { timeout: 120000 })
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

    // Setup MongoDB connection
    await mongoConnect()
    for (let trip of formattedTrips) {
        await mongoInsert(trip)
    }
    
    console.log("Scrape complete!")
    process.exit(0)
}

scrape()