const CENTER = [18.16831061820438, -65.54537588810639]
const ZOOM = 12

const BOAT_SVG = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve"><path class="accent" d="M336.4,231.3c-0.1-44.1-7.7-78.3-13.9-99.7c-10.1-35-22.9-57.7-35.1-73.8c-19.2-25.5-30.6-26.2-33.4-26.2c-5.2,0-15.8,1.7-34.5,26.2c-9.6,12.5-22.6,33.6-34,73.8c-6.3,22.2-13.6,55.9-14.8,98.7"/><rect x="170.9" y="225" class="accent" width="165.6" height="193.2"/><path class="primary" d="M327.2,250.6c-0.1-45-6.8-79.8-12.3-101.7c-9-35.7-20.3-58.9-31.1-75.3c-17.1-26-27.2-26.7-29.7-26.8c-4.6,0-14,1.8-30.7,26.8c-8.5,12.8-20.1,34.3-30.2,75.3c-5.6,22.6-12,57-13.1,100.8L327.2,250.6z"/><rect x="193.6" y="260.4" class="accent" width="120.1" height="38.7"/><path class="accent" d="M316.6,481.4H190.7c-11,0-19.8-8.9-19.8-19.8v-44.1c0-11,8.9-19.8,19.8-19.8h125.9c11,0,19.8,8.9,19.8,19.8v44.1C336.4,472.5,327.6,481.4,316.6,481.4z"/><path class="primary" d="M310.1,472.7H197.2c-9.4,0-17.1-7.7-17.1-17.1V248.4c0-9.4,7.7-17.1,17.1-17.1h112.9c9.4,0,17.1,7.7,17.1,17.1v207.2C327.2,465,319.5,472.7,310.1,472.7z"/><path class="accent" d="M295.7,453h-84.2c-7.9,0-14.4-6.4-14.4-14.4V245.6c0-7.9,6.4-14.4,14.4-14.4h84.2c7.9,0,14.4,6.4,14.4,14.4v193.1C310.1,446.6,303.7,453,295.7,453z"/></svg>`

let map, markers

$(document).ready(() => {
    dayjs.extend(window.dayjs_plugin_relativeTime)

	initializeMap()
    load()
    setInterval(load, 15000)
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

function load() {
    loadBoats()
    loadTrips()
}

function getHTMLForTrips(items, past) {
    if (items.length < 1 && !past) return "No more ferries today"
    let html = "";
    for (let item of items) {

        let port = item.direction === "outbound" ? "Vieques" : "Ceiba"

        html += "<div class='trip'>"
            html += "<div><span class='title'>Time</span>" + dayjs(item.date).format("MM/DD hh:mma") + "</div>"
            html += "<div><span class='title'>Port</span>" + port + "</div>"
            html += "<div><span class='title'>Vessel</span>" + item.vessel + "</div>"
        html += "</div>"
    }
    return html
}

function loadTrips() {
    $.ajax('/api/past-trips?limit=12', {
        success: (response) => {
            $("#past-trips").html(getHTMLForTrips(response.items, true))
        }
    })
    $.ajax('/api/upcoming-trips?limit=1', {
        success: (response) => {
            $("#upcoming-trips").html(getHTMLForTrips(response.items, false))
        }
    })
}

function updateMapMarkers(boats) {

    boats.sort((a, b) => a.timestamp - b.timestamp)
    
    markers.clearLayers()
    let boatListHTML = ""

    for (let boat of boats) {

        // Setup boat list
        boatListHTML += `<div class="boat-item ${boat.vesselColor}">`
            boatListHTML += `<span class="title">${boat.vesselName}</span>`
            boatListHTML += `<span>Estado: ${boat.status == 0 ? "en movimiento" : "amarrado"}</span>`
            boatListHTML += `<span>Velocidad: ${boat.speed} knots</span>`
            boatListHTML += `<span>Desde ${dayjs(boat.timestamp).format("MM/DD hh:mma")}`
        boatListHTML += "</div>"

        // Setup Leaflet market
        let icon = L.divIcon({
            html: BOAT_SVG,
            iconSize: 48,
            className: `boat-${boat.vesselColor}`
        })
        let marker = L.marker([boat.location.coordinates[1], boat.location.coordinates[0]], {
            icon: icon
        })
        markers.addLayer(marker)
    }

    $("#boat-list").html(boatListHTML)
}

function loadBoats() {
    $.ajax('/api/boats', {
        success: (response) => {
            updateMapMarkers(response)
        }
    })
}