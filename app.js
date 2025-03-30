const BASE_API = 'localhost:5000';
let map, infoWindow;

// variables for Google Maps drawings.
let circles = [];
let markers = [];

// variables for routes / accidents data.
let routeResponse;
let accidentPoints = [];
let routePoints = [];
let isSimulationOngoing = false;
const THRESHOLD = 0.03;
let timers = [];
const audio = new Audio('alert.mp3');

function initMap() {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer();
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 40.728657, lng: -74.001048 },
    zoom: 12
  });
  infoWindow = new google.maps.InfoWindow();
  directionsRenderer.setMap(map);

  // Try HTML5 geolocation.
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        document.getElementById('start-location').value = pos.lat + ',' + pos.lng

        infoWindow.setPosition(pos);
        infoWindow.setContent("Your current location.");
        infoWindow.open(map);
        map.setCenter(pos);
      },
      () => {
        handleLocationError(true, infoWindow, map.getCenter());
      }
    );
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }

  document.getElementById('submit-button').addEventListener('click', function () {
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    calculateAndDisplayRoute(directionsService, directionsRenderer, startLocation, endLocation);
    fetchApiAccidentLocations(startLocation, endLocation);
  });

  document.getElementById('test-button').addEventListener('click', function () {
    stopNavigationSimulation();
    const startLocation = document.getElementById('start-location').value;
    const endLocation = document.getElementById('end-location').value;
    calculateAndDisplayRoute(directionsService, directionsRenderer, startLocation, endLocation, true);
    fetchApiAccidentLocations(startLocation, endLocation);
  });

  document.getElementById('stop-button').addEventListener('click', function () {
    stopNavigationSimulation();
    map.setZoom(12);
  });
}

function calculateAndDisplayRoute(directionsService, directionsRenderer, startLocation, endLocation, simulate = false) {
  directionsService.route(
    {
      origin: {
        query: startLocation
      },
      destination: {
        query: endLocation
      },
      travelMode: google.maps.TravelMode.DRIVING
    },
    (response, status) => {
      if (status === "OK") {
        console.log('Route response: ');
        console.log(response);
        getListOfPoints(response);
        routeResponse = response;
        directionsRenderer.setDirections(response);

        if (simulate) {
          navigateSimulation();
        }

      } else {
        window.alert("Directions request failed due to " + status);
      }
    }
  );
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  console.log(browserHasGeolocation
    ? "Error: The Geolocation service failed."
    : "Error: Your browser doesn't support geolocation.");
  infoWindow.open(map);
}

function getListOfPoints(routeResponse) {
  routePoints = [];
  routeResponse.routes[0].overview_path.forEach((path) => {
    routePoints.push({ 'lat': path.lat(), 'lng': path.lng() })
  });
  console.log(JSON.stringify(routePoints));
}

function navigateSimulation() {
  console.log('simulation...');
  routePoints.forEach((routePoint, i) => {
    timers.push(setTimeout(() => {
      console.log(routePoint.lat, routePoint.lng);
      deleteMarkers();
      addMarker(routePoint);
      map.setZoom(18);
      map.setCenter(routePoint);
      if (pointCloseToAccident(routePoint.lat, routePoint.lng)) {
        console.log('Close to accident! Current lat lng: ');
        console.log(routePoint.lat, routePoint.lng);
        handleAlert(true);
      } else {
        handleAlert(false)
      }
      //todo set the point to map and calculate if it's too close to any accident point.
    }, i * 1500));
  });
}

function stopNavigationSimulation() {
  routePoints = [];
  deleteMarkers();
  timers.forEach(timer => { clearTimeout(timer) });
}

function pointCloseToAccident(lat, lng) {
  for (let i = 0; i < accidentPoints.length; i++) {
    if (distance(lat, lng, accidentPoints[i].lat, accidentPoints[i].lng, 'M') <= THRESHOLD) {
      return true;
    }
  }
  return false;
}

function handleAlert(show) {
  if (show) {
    audio.play();
    document.getElementById('accident-alert').style.visibility = 'visible';
  } else {
    document.getElementById('accident-alert').style.visibility = 'hidden';
  }
}

function fetchApiAccidentLocations(startLocation, endLocation) {
  removeAllCircles();
  axios.get(`${BASE_API}/api/getAccidentLocations`, {
    params: {
      startLocation: startLocation,
      endLocation: endLocation
    }
  })
    .then(response => {
      console.log(`success getting API`);
      console.log(response.data);
      if (response.data) {
        let markerPoints = [];
        accidentPoints = response.data.map((data) => {
          return {
            'lat': data.Start_Lat,
            'lng': data.Start_Lng,
            'isAccident': !!data.prediction
          }
        });
        console.log('accidentPoints', accidentPoints);
        response.data.forEach(data => {
          if (!!data.prediction) {
            const cityCircle = new google.maps.Circle({
              strokeColor: "#FF0000",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#FF0000",
              fillOpacity: 0.35,
              map,
              center: {
                lat: data.Start_Lat,
                lng: data.Start_Lng
              },
              radius: 50,
            });
            circles.push(cityCircle);
          }
        })
      }
    })
    .catch(error => console.error(error));
}

function removeAllCircles() {
  for (let i in circles) {
    circles[i].setMap(null);
  }
  circles = [];
}

// Adds a marker to the map and push to the array.
function addMarker(location) {
  const marker = new google.maps.Marker({
    position: location,
    map: map,
  });
  markers.push(marker);
}

// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (let i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
}

// Shows any markers currently in the array.
function showMarkers() {
  setMapOnAll(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  clearMarkers();
  markers = [];
}


//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
//:::                                                                         :::
//:::  This routine calculates the distance between two points (given the     :::
//:::  latitude/longitude of those points). It is being used to calculate     :::
//:::  the distance between two locations using GeoDataSource (TM) prodducts  :::
//:::                                                                         :::
//:::  Definitions:                                                           :::
//:::    South latitudes are negative, east longitudes are positive           :::
//:::                                                                         :::
//:::  Passed to function:                                                    :::
//:::    lat1, lon1 = Latitude and Longitude of point 1 (in decimal degrees)  :::
//:::    lat2, lon2 = Latitude and Longitude of point 2 (in decimal degrees)  :::
//:::    unit = the unit you desire for results                               :::
//:::           where: 'M' is statute miles (default)                         :::
//:::                  'K' is kilometers                                      :::
//:::                  'N' is nautical miles                                  :::
//:::                                                                         :::
//:::  Worldwide cities and other features databases with latitude longitude  :::
//:::  are available at https://www.geodatasource.com                         :::
//:::                                                                         :::
//:::  For enquiries, please contact sales@geodatasource.com                  :::
//:::                                                                         :::
//:::  Official Web site: https://www.geodatasource.com                       :::
//:::                                                                         :::
//:::               GeoDataSource.com (C) All Rights Reserved 2018            :::
//:::                                                                         :::
//:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

function distance(lat1, lon1, lat2, lon2, unit) {
  if ((lat1 == lat2) && (lon1 == lon2)) {
    return 0;
  }
  else {
    let radlat1 = Math.PI * lat1 / 180;
    let radlat2 = Math.PI * lat2 / 180;
    let theta = lon1 - lon2;
    let radtheta = Math.PI * theta / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
      dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180 / Math.PI;
    dist = dist * 60 * 1.1515;
    if (unit == "K") { dist = dist * 1.609344 }
    if (unit == "N") { dist = dist * 0.8684 }
    return dist;
  }
}


$(document).ready(function () {


});

