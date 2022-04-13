const { MongoClient } = require("mongodb")

// Validate environment variables
const req_env = [
    "MAIN_DB_HOST", "MAIN_DB_NAME", "MAIN_DB_USER", "MAIN_DB_PASS",
    "ARCHIVE_DB_HOST", "ARCHIVE_DB_NAME", "ARCHIVE_DB_USER", "ARCHIVE_DB_PASS",
    "HOURS_TO_KEEP"
]
for (let env of req_env) if (process.env[env] === undefined) throw(`Enviornment variable ${env} is required`)

const HOURS_TO_KEEP = parseInt(process.env.HOURS_TO_KEEP)
const MAIN_DB_URI = `mongodb://${process.env.MAIN_DB_USER}:${process.env.MAIN_DB_PASS}@${process.env.MAIN_DB_HOST}/${process.env.MAIN_DB_NAME}`
const ARCHIVE_DB_URI = `mongodb://${process.env.ARCHIVE_DB_USER}:${process.env.ARCHIVE_DB_PASS}@${process.env.ARCHIVE_DB_HOST}/${process.env.ARCHIVE_DB_NAME}`

let mainDbClient = new MongoClient(MAIN_DB_URI)
let archiveDbClient = new MongoClient(ARCHIVE_DB_URI)
let mainDb, archiveDb

async function archive() { 

    try {
        console.log("Connecting to main database...")
        await mainDbClient.connect()
        console.log("Connecting to archive database...")
        await archiveDbClient.connect()

        mainDb = mainDbClient.db(process.env.MAIN_DB_NAME)
        archiveDb = archiveDbClient.db(process.env.ARCHIVE_DB_NAME)
    } catch (err) {
        console.error(err)
        process.exit(1);
    }

    let date = new Date();
    let timestamp = date.getTime() - (HOURS_TO_KEEP * 60 * 60 * 1000)
    let query = { "timestamp": { "$lt": timestamp }}

    // Get documents to archive
    console.log(`Getting documents before ${timestamp}...`)
    let docs = []
    try {
        let docsCursor = mainDb.collection("ais").find(query)
        await docsCursor.forEach(doc => {
            docs.push(doc)
        })
    } catch(err) {
        console.error(err)
        process.exit(1);
    }

    // Copy documents to archive
    try {
        console.log(`Copying ${docs.length} documents to archive...`)
        await archiveDb.collection("ais").insertMany(docs, {ordered: false})
    } catch(err) {
        if (err.code === 11000) {
            console.log(`${err.writeErrors.length} duplicates skipped!`)
        } else {
            console.error(err)
            process.exit(1)
        }
    }
    console.log("Documents copied!")

    // Delete archived documents
    console.log("Deleting archived documents...")
    try {
        await mainDb.collection("ais").deleteMany(query)
    } catch(err) {
        console.error(err)
        process.exit(1)
    }
    
    console.log("Archive complete!")
    process.exit(0)
}

archive()