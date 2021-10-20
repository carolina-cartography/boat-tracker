const CENTER = [18.16831061820438, -65.54537588810639]
const ZOOM = 12

let map

$(document).ready(() => {
	initializeMap()
    loadTrips()
})

function initializeMap() {

    // Initialize map
	map = L.map('leaflet', { 
		attributionControl:false,  
		scrollWheelZoom: true
	})

    // Add Open Street Map layer
    L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		tms: false
    }).addTo(map)

	// Position zoom controls
	map.zoomControl.setPosition('bottomright')

    // Zoom to position
    map.setView(CENTER, ZOOM)
}

function getHTMLForTrips(items, past) {
    if (items.length < 1 && !past) return "No more ferries today"
    let html = "";
    for (let item of items) {

        // Get components
        let date = new Date(item.date)
        let port = item.direction === "outbound" ? "Vieques" : "Ceiba";

        // Add HTML
        html += "<div class='trip'>"
            html += "<div><span class='title'>Time</span>" + dayjs(item.date).format("MM/DD hh:mma") + "</div>"
            html += "<div><span class='title'>Port</span>" + port + "</div>"
            html += "<div><span class='title'>Vessel</span>" + item.vessel + "</div>"
        html += "</div>"

        // Only show one for upcoming
        if (!past) return html
    }
    return html
}

function loadTrips() {
    $.ajax('/api/past-trips', {
        success: (response) => {
            $("#past-trips").html(getHTMLForTrips(response.items, true))
        }
    })
    $.ajax('/api/upcoming-trips', {
        success: (response) => {
            $("#upcoming-trips").html(getHTMLForTrips(response.items, false))
        }
    })
}