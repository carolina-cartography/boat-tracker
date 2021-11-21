const CENTER = [18.16831061820438, -65.54537588810639]
const ZOOM = 12

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
    $.ajax('/api/past-trips?limit=10', {
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

function updateMapMarkers(aisArray) {
    markers.clearLayers()
    for (let ais of aisArray) {
        let marker = L.marker([ais.location.coordinates[1], ais.location.coordinates[0]])
        let popupText = `<b>${ais.vesselName}</b>`
        popupText += `<br />Speed: ${ais.speed} knots`
        popupText += `<br />Updated ${dayjs(ais.timestamp).format("h:ma")}`
        marker.bindPopup(popupText, {
            closeButton: false,
            autoClose: false,
            closeOnEscapeKey: false,
            closeOnClick: false,
            autoPan: false,
        }).openPopup()
        markers.addLayer(marker)
    }
}

function loadBoats() {
    $.ajax('/api/boats', {
        success: (response) => {
            updateMapMarkers(response)
        }
    })
}