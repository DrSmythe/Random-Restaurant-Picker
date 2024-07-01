// Constants
const SIGNIFICANT_DISTANCE_THRESHOLD = 8046.72; // 5 miles in meters
const MAX_RESULTS = 60; // Maximum number of restaurants to fetch
const LOCATION_CHECK_INTERVAL = 600000; // 10 minutes in milliseconds

// Initialize cached variables
let cachedRestaurants = getCachedRestaurants(); // Initialize with cached data from localStorage
let cachedLocation = getCachedLocation(); // Initialize with cached location from localStorage

// Clear cached data on page load
clearCachedData();

// Check user's location only on page load
checkLocationForSignificantChanges();

document.getElementById('pickButton').addEventListener('click', () => {
    const pickButton = document.getElementById('pickButton');
    pickButton.disabled = true; // Disable the button to prevent multiple clicks
    pickButton.textContent = 'Fetching...'; // Show loading message

    if (cachedRestaurants.length > 0) {
        setTimeout(() => {
            displayRandomRestaurantFromCache();
            pickButton.disabled = false; // Re-enable the button
            pickButton.textContent = 'Pick a Restaurant'; // Reset button text
        }, 500); // Adding a slight delay for a better UX
    } else {
        getLocationAndFetchRestaurants();
    }
});

function checkLocationForSignificantChanges() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const currentLocation = { latitude, longitude };
            
            if (cachedLocation) {
                const distance = calculateDistance(currentLocation, cachedLocation);
                if (distance > SIGNIFICANT_DISTANCE_THRESHOLD) {
                    clearCachedData();
                    refreshPage(); // Refresh page if there is a significant location change
                }
            }

            cachedLocation = currentLocation;
            cacheLocation(currentLocation);
        }, () => {
            console.log('Failed to get your location.');
        });
    } else {
        console.log('Geolocation is not supported by this browser.');
    }
}

function getLocationAndFetchRestaurants() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const currentLocation = { latitude, longitude };

            try {
                const mapElement = document.createElement('div');
                const map = new google.maps.Map(mapElement, {
                    center: { lat: latitude, lng: longitude },
                    zoom: 15
                });
                const placesService = new google.maps.places.PlacesService(map);
                const request = {
                    location: new google.maps.LatLng(latitude, longitude),
                    radius: 16093.4, // 10 miles in meters
                    type: 'restaurant',
                    openNow: true
                };
                
                const allResults = [];
                const handlePage = (results, status, pagination) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                        allResults.push(...results);
                        if (pagination.hasNextPage && allResults.length < MAX_RESULTS) {
                            pagination.nextPage();
                        } else {
                            const uniqueResults = filterUniqueRestaurants(allResults);
                            // Cache fetched restaurants and current location
                            cacheRestaurants(uniqueResults);
                            cacheLocation(currentLocation);
                            cachedRestaurants = uniqueResults;
                            cachedLocation = currentLocation;
                            displayRandomRestaurantFromCache();
                            const pickButton = document.getElementById('pickButton');
                            pickButton.disabled = false; // Re-enable the button
                            pickButton.textContent = 'Pick a Restaurant'; // Reset button text
                        }
                    } else {
                        displayError('No open restaurants found.');
                    }
                };

                placesService.nearbySearch(request, handlePage);
            } catch (error) {
                displayError(`Failed to fetch restaurant. ${error.message}`);
            }
        }, () => {
            displayError('Failed to get your location.');
        });
    } else {
        displayError('Geolocation is not supported by this browser.');
    }
}

function displayRandomRestaurantFromCache() {
    if (cachedRestaurants.length > 0) {
        const randomIndex = Math.floor(Math.random() * cachedRestaurants.length);
        displayRestaurant(cachedRestaurants[randomIndex]);
    } else {
        console.log('No cached restaurants available.');
        getLocationAndFetchRestaurants();
    }
}

function displayRestaurant(restaurant) {
    document.getElementById('restaurantName').textContent = restaurant.name;
    document.getElementById('restaurantAddress').textContent = `Address: ${restaurant.vicinity}`;
    document.getElementById('restaurantRating').textContent = `Rating: ${restaurant.rating}`;
    document.getElementById('restaurantLink').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.vicinity)}`;
    document.getElementById('restaurant').classList.remove('hidden');
}

function displayError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    const pickButton = document.getElementById('pickButton');
    pickButton.disabled = false; // Re-enable the button
    pickButton.textContent = 'Pick a Restaurant'; // Reset button text
}

function cacheRestaurants(restaurants) {
    localStorage.setItem('cachedRestaurants', JSON.stringify(restaurants));
}

function getCachedRestaurants() {
    const cachedData = localStorage.getItem('cachedRestaurants');
    return cachedData ? JSON.parse(cachedData) : [];
}

function cacheLocation(location) {
    localStorage.setItem('cachedLocation', JSON.stringify(location));
}

function getCachedLocation() {
    const cachedData = localStorage.getItem('cachedLocation');
    return cachedData ? JSON.parse(cachedData) : null;
}

function clearCachedData() {
    localStorage.removeItem('cachedRestaurants');
    localStorage.removeItem('cachedLocation');
    cachedRestaurants = [];
    cachedLocation = null;
    document.getElementById('restaurant').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    console.log('Cached data cleared due to page refresh or significant location change.');
}

function calculateDistance(location1, location2) {
    const R = 6371e3; // Earth's radius in meters
    const lat1 = location1.latitude * Math.PI / 180;
    const lat2 = location2.latitude * Math.PI / 180;
    const deltaLat = (location2.latitude - location1.latitude) * Math.PI / 180;
    const deltaLng = (location2.longitude - location1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function filterUniqueRestaurants(restaurants) {
    const seen = new Set();
    return restaurants.filter((restaurant) => {
        const name = restaurant.name.toLowerCase();
        if (seen.has(name)) {
            return false;
        }
        seen.add(name);
        return true;
    });
}

// Function to refresh the page
function refreshPage() {
    window.location.reload();
}

// Set interval to check location for significant changes every 10 minutes
setInterval(checkLocationForSignificantChanges, LOCATION_CHECK_INTERVAL);