let map, infoWindow;

// variables for Google Maps drawings.
let circles = [];
let markers = [];

// variables for routes / accidents data.
let routeResponse;
let accidentPoints = [];
let routePoints = [];

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
    console.log(startLocation);
    console.log(endLocation);
    calculateAndDisplayRoute(directionsService, directionsRenderer, startLocation, endLocation);
    fetchApiAccidentLocations(startLocation, endLocation);
  });

  document.getElementById('test-button').addEventListener('click', function () {
    // Prefill start and end location
    const testStartLocation = 'Wall Street';
    const testEndLocation = 'Times Square';
    document.getElementById('start-location').value = testStartLocation;
    document.getElementById('end-location').value = testEndLocation;
    calculateAndDisplayRoute(directionsService, directionsRenderer, testStartLocation, testEndLocation, true);
    fetchApiAccidentLocations(testStartLocation, testEndLocation);
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
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

function getListOfPoints(routeResponse) {
  routePoints = [];
  routeResponse.routes[0].overview_path.forEach((path) => {
    routePoints.push({'lat': path.lat(), 'lng': path.lng()})
  });
  console.log(JSON.stringify(routePoints));
}

function navigateSimulation() {
  console.log('simulation...');
  routePoints.forEach((routePoint, i) => {
    setTimeout(() => {
      console.log(routePoint.lat, routePoint.lng);
      deleteMarkers();
      addMarker(routePoint);
      //todo set the point to map and calculate if it's too close to any accident point.
    }, i * 500);
  });
}

function fetchApiAccidentLocations(startLocation, endLocation) {
  removeAllCircles();
  axios.get('http://18.223.153.4:5000/api/getAccidentLocations', {
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
          accidentPoints = response.data.map((data) => !!data.prediction);
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
                radius: 10,
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


$(document).ready(function () {

  
});

