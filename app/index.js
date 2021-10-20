const Express = require('express')
const Morgan = require('morgan')
const Backend = require('./backend.js')

// Validate environment variables
const req_env = ["MONGO_HOST", "MONGO_NAME", "MONGO_USER", "MONGO_PASS", "PORT"]
for (let env of req_env) if (process.env[env] === undefined) throw(`Enviornment variable ${env} is required`)

async function start() {

	// Setup server
    const server = Express()
    server.use(Morgan('tiny'))

    // Setup backend routes
    await Backend.setup(server)

    // Setup frontend routes
    server.use(Express.static('public'))
    server.get('/', function (req, res) {
        res.sendFile('./public/index.html', {root: "."})
    })

    // Setup 404
    server.use(function (req, res, next) {
        res.status(404).send("404 Not Found")
    })

    // Listen on port
    server.listen(process.env.PORT, () => console.log(`boat-tracker listening on port ${process.env.PORT}...`))
}
start()

