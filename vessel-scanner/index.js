const SerialPort = require('serialport')
const AisDecoder = require('ggencoder').AisDecode
const { MongoClient } = require("mongodb")
const Fetch = require("node-fetch")

// Validate environment variables
const req_env = ["MONGO_HOST", "MONGO_NAME", "MONGO_USER", "MONGO_PASS", "AIS_SERIAL_PORT"]
for (let env of req_env) if (process.env[env] === undefined) throw(`Enviornment variable ${env} is required`)

// Get MMSI list ============================================
let mmsiMap = {}
async function getMMSIList() {
    console.log("Getting MMSI list from backend...")
    try {
        let mmsiResponse = await Fetch("https://boat-tracker.carolinacartography.org/api/mmsi-list")
        mmsiList = await mmsiResponse.json()
        for (var mmsi of mmsiList) mmsiMap[mmsi] = true
        console.log(`Fetched MMSI list: ${mmsiList}`)
    } catch (err) {
        console.error(`Could not get MMSI list: ${err}`)
    }
}
getMMSIList()

// Setup Mongo client ========================================
let db;
console.log("Connecting to database...")
let mongoClient = new MongoClient(
    `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/${process.env.MONGO_NAME}`
)
mongoClient.connect((err) => {
    if (err) throw(err)
    db = mongoClient.db(process.env.MONGO_DB)
    console.log("Connected to database!")
})

// Setup serial reader ========================================
console.log(`Attempting to stream AIS data from ${process.env.AIS_SERIAL_PORT}...`)
let serialPort = new SerialPort(process.env.AIS_SERIAL_PORT, {
    baudRate: 38400
})
serialPort.on('data', (buffer) => {
    let packet = buffer.toString().replace("\n", "")

    // Attempt to decode packet
    let session = {}
    let decoded = new AisDecoder(buffer.toString(), session)
    if (!decoded.valid) return console.error(`Invalid packet`)

    // Only save packets matching MMSI list
    if (mmsiMap[decoded.mmsi] !== true) {
        console.log(`Skipping packet for ${decoded.mmsi}`)
        return
    }

    // Attempt to write relevant entries to database
    // TODO: Don't save duplicate entries (when mmsi entry with lat, long, status, speed not changed, requires a db query)
    if (db) {
        db.collection("ais").insertOne({
            timestamp: Date.now(),
            mmsi: decoded.mmsi,
            location: {
                type: "Point",
                coordinates: [decoded.lon, decoded.lat]
            },
            status: decoded.navstatus,
            speed: decoded.sog,
        }).then(result => {
            console.log(`Saved entry for ${decoded.mmsi} in database`)
        }).catch(err => {
            console.error(`Database error: ${err}`)
        })
    }
})
serialPort.on('error', (err) => {
    if (err.toString().includes("cannot open")) {
        console.log(`Can't connect to ${process.env.AIS_SERIAL_PORT}!`)
        process.exit(1)
    }
    console.error(err)
})

