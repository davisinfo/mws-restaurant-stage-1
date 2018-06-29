/**
 * Common database helper functions.
 */
let dbHandler = new Dexie("MwsDB")
dbHandler.version(1).stores({
    restaurants: "++id,name,cuisine_type,neighborhood"
});


class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const server_url = document.location.hostname + ':1337'
        return `http://${server_url}/restaurants`;
    }

    static fetchRestaurantsData() {
        return new Promise(function (resolve, reject) {
            $.ajax(DBHelper.DATABASE_URL, {
                type: 'get',
                dataType: 'json',
                error: function (xhr, textStatus) {
                    // Rejecting promise to make dbHandler.open() fail.
                    reject(textStatus);
                },
                success: function (data) {
                    // Resolving Promise will launch then() below.
                    resolve(data);
                }
            });
        }).then(function (data) {
            console.log("Got ajax response. We'll now add the objects.");
            // By returning the dbHandler.transaction() promise, framework will keep
            // waiting for this transaction to commit before resuming other
            // db-operations.
            return dbHandler.transaction('rw', dbHandler.restaurants, function () {
                data.forEach(function (item) {
                    console.log("Adding object: " + JSON.stringify(item));
                    dbHandler.restaurants.put(item);
                });
            });
        }).then(function () {
            console.log ("Transaction committed");
        });
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {
        let alreadyPopulated = false;
        dbHandler.on('ready', function () {
            // on('ready') event will fire when database is open but
            // before any other queued operations start executing.
            // By returning a Promise from this event,
            // the framework will wait until promise completes before
            // resuming any queued database operations.
            // Let's start by using the count() method to detect if
            // database has already been populated.
            return dbHandler.restaurants.count(function (count) {
                if (count > 0) {
                    console.log("Already populated");
                    alreadyPopulated = true;
                } else {
                    alreadyPopulated = false;
                    console.log("Database is empty. Populating from ajax call...");
                    // We want framework to continue waiting, so we encapsulate
                    // the ajax call in a Promise that we return here.
                    return DBHelper.fetchRestaurantsData();
                }
            });
        });
        dbHandler.open();

        dbHandler.restaurants.toArray().then(function (array) {
           let restaurants = array;
            callback(null, restaurants);
        }).catch(function() {
            let error = (`Request failed. Returned status of ${xhr.status}`);
            callback(error, null);
        }).then(function () {
            if(alreadyPopulated)
            {
                DBHelper.fetchRestaurantsData();
            }
        });
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                const restaurant = restaurants.find(r => r.id == id);
                if (restaurant) { // Got the restaurant
                    callback(null, restaurant);
                } else { // Restaurant does not exist in the database
                    callback('Restaurant does not exist', null);
                }
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type == cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood == neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants
                if (cuisine != 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type == cuisine);
                }
                if (neighborhood != 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood == neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/dist/images/${restaurant.photograph + '-400w.jpg'}`);
    }

    /**
     * Restaurant image Alt.
     */
    static imageAltForRestaurant(restaurant) {
        return (`${restaurant.name}, ${restaurant.cuisine_type} restaurant in ${restaurant.neighborhood}`);
    }

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        const marker = new google.maps.Marker({
                position: restaurant.latlng,
                title: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant),
                map: map,
                animation: google.maps.Animation.DROP
            }
        );
        return marker;
    }

}
