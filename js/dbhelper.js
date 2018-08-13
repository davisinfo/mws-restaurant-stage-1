/**
 * Common database helper functions.
 */
let dbHandler = new Dexie("MwsDB")
dbHandler.version(1).stores({
    restaurants: "++id,name,cuisine_type,neighborhood",
});
dbHandler.version(2).stores({
    restaurants: "++id,name,cuisine_type,neighborhood",
    reviews: "++id,restaurant_id"
});
dbHandler.version(3).stores({
    restaurants: "++id,name,cuisine_type,neighborhood",
    reviews: "++id,restaurant_id,unsaved"
});


class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const server_url = '127.0.0.1:1337'
        return `http://${server_url}/`;
    }

    static fetchRestaurantsData() {
        return new Promise(function (resolve, reject) {
            $.ajax(DBHelper.DATABASE_URL + 'restaurants', {
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
            console.log("Transaction committed");
        });
    }

    static fetchAllRestaurantsReviewsData() {
        return new Promise(function (resolve, reject) {
            DBHelper.submitPendingReviews().then(function () {
                hideReviewSaveError();
                $.ajax(DBHelper.DATABASE_URL + 'reviews', {
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
            }).catch(function (error) {
                reject(error);
            });
        }).then(function (data) {
            console.log("Got ajax response. We'll now add the objects.");
            // By returning the dbHandler.transaction() promise, framework will keep
            // waiting for this transaction to commit before resuming other
            // db-operations.
            return dbHandler.transaction('rw', dbHandler.reviews, function () {
                data.forEach(function (item) {
                    console.log("Adding object: " + JSON.stringify(item));
                    dbHandler.reviews.put(item);
                });
            });
        }).then(function () {
            console.log("Transaction committed");
        });
    }

    static fetchRestaurantReviewsData(id) {
        return new Promise(function (resolve, reject) {
            DBHelper.submitPendingReviews().then(function () {
                hideReviewSaveError();
                $.ajax(DBHelper.DATABASE_URL + 'reviews/?restaurant_id=' + id, {
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
            }).catch(function (error) {
                reject(error);
            });
        }).then(function (data) {
            console.log("Got ajax response for reviews. We'll now add the objects.");
            // By returning the dbHandler.transaction() promise, framework will keep
            // waiting for this transaction to commit before resuming other
            // db-operations.
            return dbHandler.transaction('rw', dbHandler.reviews, function () {
                data.forEach(function (item) {
                    console.log("Adding object: " + JSON.stringify(item));
                    dbHandler.reviews.put(item);
                });
            });
        }).then(function () {
            console.log("Transaction committed");
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
                    console.log("Restaurants already populated");
                    alreadyPopulated = true;
                } else {
                    alreadyPopulated = false;
                    console.log("Restaurants database is empty. Populating from ajax call...");
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
        }).catch(function () {
            let error = (`Request failed.`);
            callback(error, null);
        }).then(function () {
            if (alreadyPopulated) {
                DBHelper.fetchRestaurantsData();
            }
        });
    }

    /**
     * Fetch all reviews for a restaurant.
     */
    static fetchRestaurantReviews(id, callback) {
        let alreadyPopulated = false;
        dbHandler.reviews.count(function (count) {
            if (count > 0) {
                console.log("Reviews already populated");
                alreadyPopulated = true;
                dbHandler.reviews.where('restaurant_id').equals(id).toArray().then(function (array) {
                    // dbHandler.reviews.toArray().then(function (array) {
                    let reviews = array;
                    callback(null, reviews);
                })
            }
            // We want framework to continue waiting, so we encapsulate
            // the ajax call in a Promise that we return here.
            if (!alreadyPopulated) {
                DBHelper.fetchAllRestaurantsReviewsData().then(() => {
                    console.log("Reviews database is empty. Populating from ajax call...");
                    dbHandler.reviews.where('restaurant_id').equals(id).toArray().then(function (array) {
                        // dbHandler.reviews.toArray().then(function (array) {
                        let reviews = array;
                        callback(null, reviews);
                    })
                });
            } else {
                DBHelper.fetchRestaurantReviewsData(id).then(() => {
                    console.log("Updated reviews for restaurant");
                });
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
     * Add a new review
     */
    static addReview(restaurant_id) {
        DBHelper.submitPendingReviews().then(function () {
            hideReviewSaveError();
            let data = {
                name: document.getElementById('add-review-username').value,
                rating: document.getElementById('add-review-rating').value,
                comments: document.getElementById('add-review-comments').value,
                restaurant_id: parseInt(restaurant_id)
            };

            fetch(DBHelper.DATABASE_URL + 'reviews/', {
                body: JSON.stringify(data), // data can be `string` or {object}!
                headers: {
                    'Content-Type': 'application/json'
                },
                method: "post"
            }).then(function (response) {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Network response was not ok.');
            }).then(function (json) {
                dbHandler.reviews.put(json);
                appendReviewHTML(json);
            }).catch(function (error) {
                // we could not send the review to server
                // cache it locally for submission and inform user
                let item = {
                    name: document.getElementById('add-review-username').value,
                    rating: document.getElementById('add-review-rating').value,
                    comments: document.getElementById('add-review-comments').value,
                    restaurant_id: parseInt(restaurant_id),
                    unsaved: 1
                }
                dbHandler.reviews.put(item);
                appendReviewHTML(item);
                displayReviewSaveError("Error saving review to server! We'll retry later.");
            });
        }).catch(function (error) {
            console.log('Error submitting pending reviews!');
            let item = {
                name: document.getElementById('add-review-username').value,
                rating: document.getElementById('add-review-rating').value,
                comments: document.getElementById('add-review-comments').value,
                restaurant_id: parseInt(restaurant_id),
                unsaved: 1
            }
            dbHandler.reviews.put(item);
            appendReviewHTML(item);
            displayReviewSaveError("Error saving pending reviews to server! We'll retry later.");
        });
    }

    /**
     * Submit unsaved reviews
     */
    static submitPendingReviews() {
        return new Promise(function (resolve, reject) {
            dbHandler.reviews.where('unsaved').equals(1).toArray().then(function (array) {
                return new Promise(function (resolve, reject) {
                    let promisesArray = [];
                    // dbHandler.reviews.toArray().then(function (array) {
                    array.forEach(function (review) {
                        promisesArray.push(new Promise(function (resolve) {
                            review.unsaved = 0;
                            review.id = null;
                            fetch(DBHelper.DATABASE_URL + 'reviews/', {
                                body: JSON.stringify(review), // data can be `string` or {object}!
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                method: "post"
                            }).then(function (response) {
                                if (response.ok) {
                                    return response.json();
                                }
                                throw new Error('Network response was not ok.');
                            }).then(function (json) {
                                return new Promise(function (resolve2, reject2) {
                                    dbHandler.reviews.put(json).then(
                                        dbHandler.reviews.delete(review.id)
                                    ).then(function (id) {
                                        resolve2();
                                    }).catch(function (error) {
                                        resolve2();
                                    });
                                });
                            }).then(function () {
                                resolve();
                            }).catch(function (error) {
                                console.log('Error ' + error.message);
                                reject(error);
                            });
                        }));
                    });
                    Promise.all(promisesArray).then(function (response) {
                        resolve(response);
                    }).catch(function (error) {
                        reject(error);
                    });
                });
            }).then(function () {
                resolve();
            }).catch(function (error) {
                reject(error);
            });
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
