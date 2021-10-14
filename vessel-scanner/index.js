const SerialPort = require('serialport')
const AisDecoder = require('ggencoder').AisDecode
const { MongoClient } = require("mongodb")

// Validate environment variables
const req_env = ["MONGO_HOST", "MONGO_NAME", "MONGO_USER", "MONGO_PASS", "AIS_SERIAL_PORT"]
for (let env of req_env) if (process.env[env] === undefined) throw(`Enviornment variable ${env} is required`)

// Setup Mongo client
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

// Setup serial reader
console.log(`Attempting to stream AIS data from ${process.env.AIS_SERIAL_PORT}...`)
let serialPort = new SerialPort(process.env.AIS_SERIAL_PORT, {
    baudRate: 38400
})

// Listen to serial reader
serialPort.on('data', (buffer) => {
    console.log(`\nAIS packet received ${buffer.toString().replace("\n", "")}`)

    // Attempt to decode packet
    var decoded = new AisDecoder(buffer.toString())
    if (!decoded.valid) return console.error("Invalid packet")

    // Attempt to write relevant entries to database
    // TODO: Refine filter (only log entries from boats we care about?)
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
            speed: decoded.sog
        }).then(result => {
            console.log(`Saved entry for ${decoded.mmsi} in database`)
        }).catch(err => {
            console.error(err)
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

