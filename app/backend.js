const Express = require('express')
const BodyParser = require('body-parser')
const Cors = require('cors')

async function getBoats(req, res) {
	res.send('get boats!')
}

async function getTrips(req, res) {
	res.send('get trips!')
}

module.exports = {
	setup: async (server) => {

		// Setup router
		const router = Express.Router()
		server.use('/api', router)

		// Configure router
		router.use(BodyParser.json({
			limit: '20mb'
		}))

		// Middleware: Setup CORS functionality (allows localhost)
		router.use(Cors())
		router.options('*', Cors())

		// Setup routes
		router.get('/', (req, res) => res.send('Welcome to the Boat Tracker backend'))
		router.get('/boats', getBoats)
		router.get('/trips', getTrips)
	}
}