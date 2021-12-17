const CENTER = [18.16831061820438, -65.54537588810639]
const ZOOM = 12
const HOURS = 24
const FUTURE_HOURS = 4

const BOAT_REFRESH_INTERVAL = 15000
const TRIP_REFRESH_INTERVAL = 60000

const TRIP_WIDTH = 30
const TRIP_MINUTES = 45

const BOAT_SVG = `<svg class="boat" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path class="accent" d="M336.4,231.3c-0.1-44.1-7.7-78.3-13.9-99.7c-10.1-35-22.9-57.7-35.1-73.8c-19.2-25.5-30.6-26.2-33.4-26.2c-5.2,0-15.8,1.7-34.5,26.2c-9.6,12.5-22.6,33.6-34,73.8c-6.3,22.2-13.6,55.9-14.8,98.7"/><rect x="170.9" y="225" class="accent" width="165.6" height="193.2"/><path class="primary" d="M327.2,250.6c-0.1-45-6.8-79.8-12.3-101.7c-9-35.7-20.3-58.9-31.1-75.3c-17.1-26-27.2-26.7-29.7-26.8c-4.6,0-14,1.8-30.7,26.8c-8.5,12.8-20.1,34.3-30.2,75.3c-5.6,22.6-12,57-13.1,100.8L327.2,250.6z"/><rect x="193.6" y="260.4" class="accent" width="120.1" height="38.7"/><path class="accent" d="M316.6,481.4H190.7c-11,0-19.8-8.9-19.8-19.8v-44.1c0-11,8.9-19.8,19.8-19.8h125.9c11,0,19.8,8.9,19.8,19.8v44.1C336.4,472.5,327.6,481.4,316.6,481.4z"/><path class="primary" d="M310.1,472.7H197.2c-9.4,0-17.1-7.7-17.1-17.1V248.4c0-9.4,7.7-17.1,17.1-17.1h112.9c9.4,0,17.1,7.7,17.1,17.1v207.2C327.2,465,319.5,472.7,310.1,472.7z"/><path class="accent" d="M295.7,453h-84.2c-7.9,0-14.4-6.4-14.4-14.4V245.6c0-7.9,6.4-14.4,14.4-14.4h84.2c7.9,0,14.4,6.4,14.4,14.4v193.1C310.1,446.6,303.7,453,295.7,453z"/></svg>`

let map, markers

$(document).ready(() => {
    dayjs.extend(window.dayjs_plugin_relativeTime)
    dayjs.extend(window.dayjs_plugin_utc)
    dayjs.extend(window.dayjs_plugin_timezone)
    dayjs.extend(window.dayjs_plugin_advancedFormat)
    dayjs.locale('es')

	initializeMap()
    
    loadBoats()
    setInterval(loadBoats, BOAT_REFRESH_INTERVAL)

    loadTrips()
    setInterval(loadTrips, TRIP_REFRESH_INTERVAL)
})

function initializeMap() {

    // Initialize map
	map = L.map('leaflet', { 
		attributionControl:false,  
		scrollWheelZoom: true
	})

    // Initialize markers, add to map
    markers = L.layerGroup();
    map.addLayer(markers)

    // Add Open Street Map layer
    L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		tms: false
    }).addTo(map)

	// Position zoom controls
	map.zoomControl.setPosition('bottomright')

    // Zoom to position
    map.setView(CENTER, ZOOM)
}

async function loadTrips() {

    // Setup timeline elements
    let updatedTimeline = $("<div>", { id: 'timeline' })
    updatedTimeline.append($("<div>", { class: 'border'}))

    // Get times
    let now = dayjs()
    let upperEnd = dayjs().startOf('hour').add(FUTURE_HOURS, 'hours')
    let queryUpperEnd = upperEnd.subtract(TRIP_MINUTES, 'minutes')
    let lowerEnd = upperEnd.subtract(HOURS, 'hours')

    // Setup hour grid
    let i = 0
    while (i < HOURS) {
        let hourDiv = $("<div>", {class: 'hour'})
        hourDiv.css("top", `${60*i}px`)
        hourDiv.text(upperEnd.subtract(i, 'hours').tz("America/Puerto_Rico").format('ha'))
        updatedTimeline.append(hourDiv)
        i++
    }
    let j = 0
    while (j < HOURS*4) {
        let fifteenDiv = $("<div>", {class: 'fifteen'})
        fifteenDiv.css("top", `${15*j}px`)
        updatedTimeline.append(fifteenDiv)
        j++
    }

    // Put current time on grid
    let nowDiv = $("<div>", {class: 'now'})
    nowDiv.css("top", `${(upperEnd.format('X') - now.format('X')) / 60}px`)
    updatedTimeline.append(nowDiv)

    // Get published trips for grid
    await $.ajax(`/api/trips?before=${queryUpperEnd.format('X')}&after=${lowerEnd.format('X')}`, {
        success: (response) => {
            addTripsToTimeline(response.publishedTrips, upperEnd, updatedTimeline)
            addTripsToTimeline(response.detectedTrips, upperEnd, updatedTimeline)
        }
    })

    $("#timeline").html(updatedTimeline.html())
}

function addTripsToTimeline(trips, upperEnd, updatedTimeline) {
    let addedTrips = []
    for (let trip of trips) {

        // Stagger trips
        // NOTE: This part of the algorithm is computationally inefficient. Rethink at some point
        let marginLeft = 0
        let i = 0
        while (i < 6) {
            if (
                addedTrips[i] !== undefined && 
                trip.type === addedTrips[i].type &&
                trip.direction === addedTrips[i].direction && 
                (trip.startTime - addedTrips[i].startTime) < (TRIP_TIME * 60)
            ) marginLeft += TRIP_WIDTH + 5
            i++
        }

        // Add trip to DOM
        let tripDiv = $("<div>", {
            class: `trip ${trip.type} ${trip.direction} ${trip.vesselColor}`
        })
        let tripTop = ((upperEnd.format('X') - trip.startTime) / 60) - TRIP_TIME
        tripDiv.css("top", `${tripTop}px`)
        tripDiv.css("margin-left", `${marginLeft}px`)
        updatedTimeline.append(tripDiv)

        // Add trip array to backwards array for stagger
        addedTrips.unshift(trip)
    }
}

function updateMapMarkers(boats) {

    boats.sort((a, b) => {
        if (a.timestamp > b.timestamp) return -1;
        return 1;
    })
    
    markers.clearLayers()
    let boatListHTML = ""

    for (let boat of boats) {

        // Add boat to list
        boatListHTML += `<div id="${boat.vesselId}-item" class="boat-item ${boat.vesselColor}">`
            boatListHTML += `<span class="title">${boat.vesselName}</span>`
            boatListHTML += `<span>Estado: ${boat.status == 0 ? "en movimiento" : "amarrado"}</span>`
            if (boat.status == 0) boatListHTML += `<span>Velocidad: ${boat.speed} knots</span>`
            boatListHTML += `<span class="time">${dayjs(boat.timestamp).tz("America/Puerto_Rico").fromNow()}`
        boatListHTML += "</div>"

        // Get heading/course information
        let rotation = 0;
        if (boat.heading !== undefined && boat.heading !== 511) rotation = boat.heading
        else if (boat.course !== undefined) rotation = boat.course

        // Setup SVG element with vessel ID
        let thisSvg = BOAT_SVG
        thisSvg = thisSvg.replace("<svg", `<svg id="${boat.vesselId}-boat"`)

        // Setup Leaflet marker
        let icon = L.divIcon({
            html: thisSvg,
            iconSize: 42,
            className: `boat boat-${boat.vesselColor}`
        })
        let marker = L.marker([boat.location.coordinates[1], boat.location.coordinates[0]], {
            icon: icon
        })
        markers.addLayer(marker)

        // Rotate Leaflet marker by ID
        if (rotation !== 0) {
            $(`#${boat.vesselId}-boat`).css("transform", `rotate(${parseInt(rotation, 10)}deg)`)
        }

    }

    // Add boat list to page
    $("#boat-list").html(boatListHTML)

    // Once boat list and boats are both on page...
    for (let boat of boats) {

        // Make boat and item transparent if data is stale
        if (Date.now() - boat.timestamp > (1000*60*15)) {
            $(`#${boat.vesselId}-boat`).addClass("inactive")
            $(`#${boat.vesselId}-item`).addClass("inactive")
        } else {
            $(`#${boat.vesselId}-boat`).removeClass("inactive")
            $(`#${boat.vesselId}-item`).removeClass("inactive")
        }
    }
}

function loadBoats() {
    $.ajax('/api/boats', {
        success: (response) => {
            updateMapMarkers(response)
        }
    })
}