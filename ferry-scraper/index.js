const { MongoClient } = require("mongodb")
const Fetch = require('node-fetch')
const Moment = require('moment')

const URL = "https://my.hornblower.com/graphql"
const QUERYJSON = {
    "operationName":"ticketAvailabilityV2",
    "variables":{
       "propertyId":"hpurico",
       "bookingType":1,
       "correlationId":"152d4456-f0f2-4ef4-b151-59dbf04f0661",
       "costRateId":1,
       "withTourResources":true,
       "source":"web",
       "withPricelistTemplates":false,
       "withTicketsDataHash":true,
       "withVacancies":true,
       "skipFiltersForPastTransfers":false,
       "editOrder":false,
       "requiredQty":0
    },
    "query":"query ticketAvailabilityV2($propertyId: String!, $bookingType: String!, $date: String!, $correlationId: String!, $costRateId: Int, $token: String, $withTourResources: Boolean!, $withPricelistTemplates: Boolean!, $source: String, $tourEventId: Int, $tourEventIds: [Int], $withTicketsDataHash: Boolean!, $parentOrder: String, $withVacancies: Boolean!, $skipFiltersForPastTransfers: Boolean, $editOrder: Boolean, $requiredQty: Int) {\n  ticketAvailabilityV2(propertyId: $propertyId, bookingType: $bookingType, date: $date, correlationId: $correlationId, costRateId: $costRateId, token: $token, source: $source, tourEventId: $tourEventId, tourEventIds: $tourEventIds, withTicketsDataHash: $withTicketsDataHash, parentOrder: $parentOrder, skipFiltersForPastTransfers: $skipFiltersForPastTransfers, editOrder: $editOrder, requiredQty: $requiredQty) {\n    productInfo(propertyId: $propertyId, correlationId: $correlationId) {\n      id\n      productId\n      trackingLabel\n      pairedProducts\n      pairedProductsMinQuantity\n      dependentProducts\n      settings {\n        id\n        value\n        __typename\n      }\n      translations {\n        id\n        values {\n          id\n          value\n          __typename\n        }\n        __typename\n      }\n      media {\n        type\n        url\n        __typename\n      }\n      __typename\n    }\n    stops(propertyId: $propertyId, correlationId: $correlationId) {\n      id\n      name\n      stopNumber\n      __typename\n    }\n    pricelistTemplates(propertyId: $propertyId, correlationId: $correlationId) @include(if: $withPricelistTemplates) {\n      tourEventId\n      templates {\n        templateName\n        productIds\n        __typename\n      }\n      __typename\n    }\n    ticketsDataHashes {\n      hashId\n      ticketsData {\n        TicketId\n        TicketPrice\n        IsTaxInclusive\n        TaxPercentage\n        Taxes {\n          TaxName\n          TaxPercentage\n          TaxIncluded\n          __typename\n        }\n        TicketDescription\n        AvailableOnline\n        SortOrder\n        TourProductClass\n        TourProductSubclass\n        availability\n        availabilityPool\n        AffectsCapacity\n        packageInfo\n        advertisedPrice\n        ProductTypes {\n          id\n          value\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    vacancies(propertyId: $propertyId, correlationId: $correlationId, source: $source, costRateId: $costRateId) @include(if: $withVacancies) {\n      tourEventId\n      vacancies {\n        id\n        value\n        __typename\n      }\n      channelVacancy\n      __typename\n    }\n    ticketAvailability {\n      vacancies @include(if: $withVacancies)\n      eventTimes {\n        startTime\n        endTime\n        docksideDateTime\n        endDocksideDateTime\n        sailDateTime\n        dockDateTime\n        disembarkDateTime\n        outDateTime\n        inUseDateTime\n        __typename\n      }\n      note\n      accountingFreeze\n      BookingTypeId\n      BookingTypeDescription\n      TimedTicketTypeId\n      TimedTicketTypeDescription\n      StartDate\n      StartTime\n      EndTime\n      boardingTime\n      vacancy\n      onHold\n      Capacity\n      pricing\n      fromStopId\n      toStopId\n      numberOfStop\n      duration\n      eventStatus\n      peakHours\n      eventRank\n      ticketsDataHash\n      ticketsData {\n        TicketId\n        TicketPrice\n        IsTaxInclusive\n        TaxPercentage\n        Taxes {\n          TaxName\n          TaxPercentage\n          TaxIncluded\n          __typename\n        }\n        TicketDescription\n        AvailableOnline\n        SortOrder\n        TourProductClass\n        TourProductSubclass\n        availability\n        availabilityPool\n        AffectsCapacity\n        packageInfo\n        advertisedPrice\n        ProductTypes {\n          id\n          value\n          __typename\n        }\n        __typename\n      }\n      tourResources(propertyId: $propertyId, correlationId: $correlationId) @include(if: $withTourResources) {\n        ResourceName\n        vesselId\n        deckId\n        availableForGroups\n        availableForIndy\n        deckName\n        defaultForGroups\n        defaultForIndy\n        vessel(propertyId: $propertyId) {\n          details {\n            id\n            value\n            __typename\n          }\n          __typename\n        }\n        vesselName\n        __typename\n      }\n      meetingPoint {\n        meetingPoint\n        meetingPointCoordinates\n        meetingLocalDateTime\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n"
}

// Validate environment variables
const req_env = ["MONGO_HOST", "MONGO_NAME", "MONGO_USER", "MONGO_PASS"]
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
            db = mongoClient.db(process.env.MONGO_NAME)
            console.log("Connected to database!")
            resolve()
        })
    })
}
function mongoInsert(doc) {
    return new Promise((resolve, reject) => {
        db.collection("trips").findOne({ id: doc.id }).then(result => {
            if (result === null) {
                db.collection("trips").insertOne(doc).then(result => {
                    console.log(`Inserted doc ${doc.id}`)
                    resolve()
                }).catch(err => {
                    console.error(err)
                    resolve() // Don't reject on error for now
                })
            } else {
                console.log(`Doc ${doc.id} already exists`)
                resolve()
            }
        })
    })
}

async function scrape() {

    // Setup query (does the FOLLOWING day)
    let date = Moment().add(1,'days').format("MM/DD/YY")
    console.log(`Querying ferries for ${date}`)
    let query = QUERYJSON
    query.variables.date = date

    // Make GraphQL request
    let metadata
    try {
        console.log("Making GraphQL request...")
        let response = await Fetch(URL, {"method": "POST", "body": JSON.stringify(query), "mode": "cors"})
        let json = await response.json()
        metadata = json.data.ticketAvailabilityV2
        console.log("Done!")
    } catch (err) {
        console.error(err)
        process.exit(1)
    }

    // Don't parse if list empty
    if (metadata.ticketAvailability.length < 1) {
        console.log("No trips for date")
        process.exit(0)
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

        // Include only ferries to and from Vieques
        if (
            trip.fromStopId === viequesStopID && trip.toStopId === ceibaStopID ||
            trip.fromStopId === ceibaStopID && trip.toStopId === viequesStopID
        ) {
            let resource = trip.tourResources[0]

            // Don't handle ferries without ship data
            if (
                resource === undefined ||
                resource.vessel === undefined ||
                resource.vessel.details === undefined
            ) continue

            // Exclude ferries marked as cargo-only
            let cargoOnly = false
            for (let detail of resource.vessel.details) {
                if (detail.id === 'vesselType' && detail.value === 'cargoOnly') {
                    cargoOnly = true
                    break
                }
            }
            if (cargoOnly) continue

            // Create ship and trip identifiers
            let vesselName = resource.ResourceName
            let vesselId = vesselName.trim().toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s/g, '-')
            let id = vesselId + '-' + trip.StartDate
            
            let formattedTrip = {
                id,
                vesselId,
                direction: trip.fromStopId === ceibaStopID ? 'inbound' : 'outbound',
                date: trip.StartDate,
                boardingTime: trip.boardingTime,
                startTime: trip.eventTimes.startTime,
                endTime: trip.eventTimes.endTime,
                vessel: vesselName,
            }

            formattedTrips.push(formattedTrip)

            console.log(`Processed trip ${id}`)
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