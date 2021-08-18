// Creating map object
let myMap = L.map("map", {
    center: [34.0522, -118.2437],
    zoom: 8,
    worldCopyJump: true
});

//make the layers for controlling the map
let baseLayers = {
    "Satellite": L.tileLayer("https://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.satellite",
        accessToken: API_KEY
    }),
    "Regular": L.tileLayer("https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.mapbox-streets-v8",
        accessToken: API_KEY
    }),
    "Regular": L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.mapbox-streets-v8",
        accessToken: API_KEY
    }),
    "Terrain": L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.mapbox-terrain-v2",
        accessToken: API_KEY
    })
}

let overlays = [{
    "Markers": L.layerGroup(),
    "Tectonic Plates": L.layerGroup()
}]

// Create a legend to display information about our map
var info = L.control({
    position: "bottomright"
});

// When the layer control is added, insert a div with the class of "legend"
info.onAdd = function () {
    var div = L.DomUtil.create("div", "legend");
    return div;
};

// // Adding tile layer
// L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
//     attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
//     maxZoom: 18,
//     id: "mapbox.streets",
//     accessToken: API_KEY
// }).addTo(myMap);





// Add the info legend to the map
info.addTo(myMap);


// get geoJSON data and add markers to map

let USGS_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";
let tectonicPlatesURL = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";

let counter = 0;

let colorCutoffDepths = [10, 30, 50, 70, 90]
let colorMap = { 0: "00FFFF", 1: "00FF00", 2: "80FF00", 3: "FFFF00", 4: "FF8000", 5: "FF0000"};

function setMarkers(data) {
    for (let i = 0; i < data.features.length; i++) {
        let curr_quake = data.features[i]
        let quake_time = new Date(curr_quake.properties["time"])
        let mag_scale = curr_quake.properties["mag"]
        let quake_location = curr_quake.properties["place"]
        let quake_depth = curr_quake.geometry.coordinates[2];

        let curr_color = colorMap[colorCutoffDepths.reduce((a, b, i) => b<quake_depth ? i+1 : a, 0)]

        let markerIcon = L.divIcon({
            html: `<svg width="${mag_scale * 10}" height="${mag_scale * 10}">
                                <circle cx="${mag_scale * 5}" cy="${mag_scale * 5}" r="${mag_scale * 4}" stroke="black" stroke-width="1" fill=${"#"+curr_color} />
                                </svg>`,
            iconAnchor: L.point([mag_scale * 5, mag_scale * 5]), 
            className: "circleIcon"
        });

        let curr_item = L.marker([curr_quake.geometry.coordinates[1], curr_quake.geometry.coordinates[0]], {icon: markerIcon})
        curr_item.bindPopup("Magnitude: " + mag_scale +"<br>" + 
                            "Depth: " + quake_depth + "<br>" +
                            "Location: " + quake_location + "<br>" +
                            "Time: " + quake_time.toString());

        //cleans data by removing invalid magnitudes (negative magnitudes are meaningless)
        if(mag_scale >= 0) {
            overlays[0]["Markers"].addLayer(curr_item)
        }   
    }
}

function addPlates(pl) {
    //now add the tectonic plate polygons
    for (let i = 0; i < pl.features.length; i++) {
        coords = pl.features[i].geometry.coordinates
        let curr_plate = L.polyline(coords, {weight: 3})
        overlays[0]["Tectonic Plates"].addLayer(curr_plate)
        console.log(i)
    }
}

//get both fetch events to give the JSON data, then 
//put into the overlays
//add legend
//and add overlays to map
Promise.all([fetch(USGS_url).then(data => data.json()), fetch(tectonicPlatesURL).then(data => data.json()).then((data) => {
    //need to reverse the coordinates to get in the correct format for leaflet
    for (let i = 0; i < data.features.length; i++) {
        data.features[i].coordinates = data.features[i].geometry.coordinates.map((a) => a.reverse())
    }
    return data
})])
.then(([markers, plates]) => {
    setMarkers(markers);
    addPlates(plates);
    // now add the legend!
    addLegend(colorCutoffDepths, colorMap)
    // add all layers to myMap object once all layers have been populated with markers/polylines
    L.control.layers(baseLayers, overlays[0]).addTo(myMap)
})
.then(() => {
    //set initial base layer and overlays here
    document.querySelector(".leaflet-control-layers-base").firstElementChild.click()
    let overlays = document.querySelector(".leaflet-control-layers-overlays").children
    for (let i = 0; i < overlays.length; i++) {
        overlays[i].click()
    }
})


// Add legend to map - function defined here
function makeSwatch(color, size) {
    let colorSwatch = document.createElement("span")
    // colorSwatch.style.width = size + "px";
    // colorSwatch.style.height = size + "px";
    colorSwatch.setAttribute("width", size)
    colorSwatch.setAttribute("height", size)
    colorSwatch.style.backgroundColor = "#" + color;

    let text = ""

    for (let i = 0; i<size; i++) {
        text += " "
    }

    colorSwatch.textContent = text;

    //OLD CODE THAT TRIED TO ADD AN SVG FOR A SWATCH
    //TOO HARD TO ADD AN SVG DIRECTLY - NEED SPECIAL CODE
    // let rect = document.createElement("rect");
    // // rect.style.width = size + "px";
    // // rect.style.height = size + "px";
    // rect.setAttribute("width", size)
    // rect.setAttribute("height", size)
    // rect.style.fill = "#"+color
    // rect.style.rx = 0.2*size

    // colorSwatch.appendChild(rect)

    return colorSwatch

}



function addLegend(colorDepths, colors) {
    let legend_el = document.querySelector(".legend");
    let headerNote = document.createElement("h3")
    headerNote.textContent = "Depths"
    legend_el.appendChild(headerNote);

    for (let i = 0; i < colorDepths.length; i++) {
        let colorSwatch = makeSwatch(colors[i], 4)

        //create text element to add
        let curr_level = document.createElement("div")  

        if(i === 0) {
            curr_level.textContent += ` < ${colorDepths[0]}`
            legend_el.appendChild(curr_level);
        }
        else {
            curr_level.textContent = ` ${colorDepths[i - 1]} - ${colorDepths[i]}`
            legend_el.appendChild(curr_level);
        }

        curr_level.prepend(colorSwatch);
    }

    // Add final color and largest value category
    let lastInd = colorDepths.length
    let colorSwatch = makeSwatch(colors[lastInd], 4)


    let currLevel = document.createElement("div");
    currLevel.textContent = ` > ${colorDepths[lastInd-1]}`
    legend_el.appendChild(currLevel);
    currLevel.prepend(colorSwatch)

}