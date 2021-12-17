const Express = require('express')
const BodyParser = require('body-parser')
const Cors = require('cors')
const Async = require('async')
const { MongoClient } = require("mongodb")
const Static = require('./static.js')

let mongoClient, db;
async function setupDatabase() {
	return new Promise((resolve, reject) => {
        console.log("Connecting to database...")
        mongoClient = new MongoClient(
            `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}/${process.env.MONGO_NAME}`
        )
        mongoClient.connect((err) => {
            if (err) throw(err)
            db = mongoClient.db(process.env.MONGO_NAME)
            console.log("Connected to database!")
            resolve()
        })
    })
}

function getBoats(req, res) {
	let boats = [];

	// Use async library to parse boats in paralell
	// See https://caolan.github.io/async/v3/docs.html#each
	Async.each(Object.keys(Static.MMSI_LIBRARY), (key, callback) => {
		let mmsi = Static.MMSI_LIBRARY[key]
		db.collection("ais")
			.find({ "mmsi": mmsi })
			.sort({ "timestamp": -1 })
			.limit(1)
			.toArray((err, items) => {
				if (err) return callback()
				if (items.length < 1) return callback()

				let boat = items[0]
				boat.vesselId = key
				boat.vesselName = Static.VESSEL_NAMES[key]
				boat.vesselColor = Static.VESSEL_COLORS[key]
				boats.push(boat)

				callback()
			})
	}, () => {
		res.status(200).json(boats)
	})
}

async function getTrips(req, res) {

	let before = parseInt(req.query.before, 10)
	let after = parseInt(req.query.after, 10)

	// Get published trips
	let publishedTrips = []
	try {
		publishedTrips = await db.collection("trips")
			.find({ 
				startTime : { $gte: after, $lt: before },
			})
			.sort({ startTime: 1 })
			.toArray()
	} catch (err) {
		console.error(err)
		return res.status(500).send(err)
	}
	for (let trip of publishedTrips) {
		trip.type = 'published'
		trip.vesselColor = Static.VESSEL_COLORS[trip.vesselId]
	}

	// Get detected trips
	let detectedTrips = []
	try {

		// Get all AIS packets from Vieques port
		let aisInPort = await db.collection("ais")
			.find({
				timestamp: { $gt: after * 1000, $lt: before * 1000 },
				location: { $geoWithin: { $geometry: Static.VIEQUES_PORT_GEOMETRY } },
			})
			.sort({ timestamp: 1 })
			.toArray()

		// Get port boundary crossings
		let crossings = [];	
		let latestPackets = {}
		for (let ais of aisInPort) {

			// For each boat, save the first packets from the query if they show a boat moving into the port
			if (latestPackets[ais.mmsi] === undefined) {
				if (
					ais.status == Static.AIS_UNDERWAY &&
					ais.course < 180
				) {
					crossings.push(ais)
				}
			} 
			
			// For each boat, save the packets before and after a gap in data
			else if (ais.timestamp > latestPackets[ais.mmsi].timestamp + (1000 * 60 * Static.AIS_GAP_MINUTES)) {
				crossings.push(latestPackets[ais.mmsi])
				crossings.push(ais)
			}
			latestPackets[ais.mmsi] = ais
		}

		// Get leftover packets for departing ships that don't return in the window (wait gap to add)
		for (let mmsi of Object.keys(latestPackets)) {
			let ais = latestPackets[mmsi]
			if (
				Date.now() - ais.timestamp > (1000 * 60 * Static.AIS_GAP_MINUTES) &&
				ais.course > 180
			) crossings.push(ais)
		}

		// Determine trips from crossings
		for (let crossing of crossings) {
			let vesselId = Static.VESSEL_ID_LIBRARY[crossing.mmsi]
			let direction = crossing.course < 180 ? 'inbound' : 'outbound'
			let crossingSeconds = crossing.timestamp / 1000
			detectedTrips.push({
				direction,
				type: 'detected',
				vesselId: vesselId,
				vesselColor: Static.VESSEL_COLORS[vesselId],
				startTime: direction === 'inbound' ? (crossingSeconds - (Static.TRIP_MINUTES * 60)) : crossingSeconds
			})
		}

		detectedTrips.sort((a, b) => {
			if (a.startTime < b.startTime) return -1
			return 1
		})

	} catch (err) {
		console.error(err)
		return res.status(500).send(err)
	}

	return res.status(200).json({ publishedTrips, detectedTrips })
}

async function getMMSIList(req, res) {
	let mmsiArray = []
	for (let key of Object.keys(Static.MMSI_LIBRARY)) {
		mmsiArray.push(Static.MMSI_LIBRARY[key])
	}
	res.status(200).json(mmsiArray)
}

module.exports = {
	setup: async (server) => {

		// Setup router
		const router = Express.Router()
		server.use('/api', router)

		// Setup database
		await setupDatabase()

		// Configure router
		router.use(BodyParser.json({
			limit: '20mb'
		}))

		// Middleware: Setup CORS functionality (allows localhost)
		router.use(Cors())
		router.options('*', Cors())

		// Setup routes
		router.get('/', (req, res) => res.send('Welcome to the Boat Tracker backend'))
		router.get('/mmsi-list', getMMSIList)
		router.get('/boats', getBoats)
		router.get('/trips', getTrips)
	}
}