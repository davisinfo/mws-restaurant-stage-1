var staticCacheName = 'mws-restaurant-static-v5';
var contentImgsCache = 'mws-restaurant-images';
var allCaches = [
    staticCacheName,
    contentImgsCache
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            return cache.addAll([
                '/',
                '/sw.js',
                'restaurant.html',
                'js/dbhelper.js',
                'js/main.js',
                'js/restaurant_info.js',
                'dist/js/bundle-info-e7aebc8d07.js',
                'dist/js/bundle-main-7837711d52.js',
                'dist/css/stylesheet-55e7dfb994.css',
                'css/styles.css',
                'css/normalize.css',
            ]);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('mws-restaurant-') &&
                        !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    let requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {
        if (requestUrl.pathname.startsWith('/images/')) {
            event.respondWith(servePhoto(event.request));
            return;
        }
    }

    if(event.request.method=='GET')
    {
        let storageUrl = event.request.url.replace(/\?.*$/, '');
        event.respondWith(
            caches.open(staticCacheName).then(function (cache) {
                return caches.match(storageUrl).then(function (response) {
                    if (response) return response;

                    return fetch(event.request).then(function (networkResponse) {
                        cache.put(storageUrl, networkResponse.clone());
                        return networkResponse;
                    });
                });
            }));
    } else {
        event.respondWith(fetch(event.request));
        return;
    }

});

function servePhoto(request) {
    const storageUrl = request.url;

    return caches.open(contentImgsCache).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});