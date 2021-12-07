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

function getLimit(req) {
	return req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 10
}

async function getUpcomingTrips(req, res) {
	trips = []
	try {
		trips = await db.collection("trips")
			.find({ startTime : { $gte: Date.now() / 1000 } })
			.sort({ startTime: 1 })
			.limit(getLimit(req))
			.toArray()
		res.status(200).json({ trips })
	} catch (err) {
		res.status(500).send(err)
	}
}

async function getPastTrips(req, res) {
	let trips
	try {
		trips = await db.collection("trips")
			.find({ startTime : { $lt: Date.now() / 1000 } })
			.sort({ endTime: -1 })
			.limit(getLimit(req))
			.toArray()
	} catch (err) {
		return res.status(500).send(err)
	}
	
	for (let trip of trips) {
		await processViequesEvents(trip)
		for (let event of trip.viequesEvents) {
			event.vesselName = Static.VESSEL_NAMES[event.vesselId]
		}
	}

	return res.status(200).json({ trips })
}

// Process Vieques Events: runs algorithm to determine when a scheduled ferry left or arrived in Vieques
async function processViequesEvents(trip) {

	// Don't process trips that have already been processed
	if (trip.viequesEvents !== undefined) return

	// Setup window
	let windowFocus = trip.direction === 'inbound' ? trip.endTime : trip.startTime
	let windowStart = (windowFocus - (60 * 90)) * 1000
	let windowEnd = (windowFocus + (60 * 90)) * 1000

	// Setup sort
	let sort = trip.direction === 'inbound' ? 1 : -1;
	
	// Query AIS data
	try {

		let allAis = await db.collection("ais")
			.find({
				timestamp: { $gt: windowStart, $lt: windowEnd },
				location: { $geoWithin: { $geometry: Static.VIEQUES_PORT_GEOMETRY } },
			})
			.toArray()
		
		let relevantMMSIMap = {}
		for (let ais of allAis) {
			relevantMMSIMap[ais.mmsi] = true
		}
		
		trip.viequesEvents = []

		// If published vessel not found, collect all departures
		for (let mmsi of Object.keys(relevantMMSIMap)) {

			// Get AIS array for vessel in time window
			let aisArray = await db.collection("ais")
				.find({
					mmsi: mmsi,
					timestamp: { $gt: windowStart, $lt: windowEnd },
					location: { $geoWithin: { $geometry: Static.VIEQUES_PORT_GEOMETRY } },
				})
				.sort({ timestamp: sort })
				.toArray()
			
			trip.viequesEvents.push({
				timestamp: aisArray[0].timestamp,
				vesselId: Static.VESSEL_ID_LIBRARY[mmsi],
			})
		}
		
	} catch (err) {
		console.log(err)
	}

	if (Date.now() > windowEnd) {
		try {
			await db.collection("trips").updateOne(
				{ id: trip.id }, 
				{ $set: { viequesEvents: trip.viequesEvents }},
				{ upsert: false }
			)
		} catch (err) {
			console.error(err)
		}
	}

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
		router.get('/upcoming-trips', getUpcomingTrips)
		router.get('/past-trips', getPastTrips)
	}
}