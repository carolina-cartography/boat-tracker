const Express = require('express')
const BodyParser = require('body-parser')
const Cors = require('cors')

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

		// Set root route, configure router
		router.get('/', (req, res) => res.send('Welcome to the Boat Tracker backend'))

		// Middleware: Handle errors
		router.use((err, req, res, next) => {
			if (!err) return next();
		})
	}
}