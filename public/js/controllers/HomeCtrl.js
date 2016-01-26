angular
    .module('jound.controllers')
    .controller('HomeCtrl', function(
        $scope,
        $rootScope,
        $q,
        $timeout,
        $interval,
        $state,
        $stateParams,

        $ionicActionSheet,
        $ionicHistory,
        $ionicLoading,
        $ionicModal,
        $ionicPosition,
        $location,
        geolocation,
        toastr,

        AppConfig,
        CategoriesService,
        SanitizeService,
        VenuesService,
        RoutesService,
        AnalyticsService,
        uiGmapGoogleMapApi,
        Facebook,
        ShareService,

        VENUE_DEFAULT_IMAGE,
        BASE_64,
        NEW_VENUE_MASTER,

        focus,
        blur
    ) {
        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();

        $scope.$map = document.getElementById('map');
        $scope.categories = [];
        $scope.plainCategories = [];
        $scope.query = '';
        $scope.category = '';
        $scope.isSearchFocused = false;
        $scope.categoriesFound = 0;
        $scope.routes = [];
        $scope.venue = {};
        $scope.venues = [];
        $scope.indexedVenues = {};
        $scope.featuredVenues = [];
        $scope.indexedFeaturedVenues = {};
        $scope.markers = [];
        $scope.featuredMarkers = [];
        $scope.points = [];
        $scope.currentMarker = false;
        $scope.currentModel = false;
        $scope.route1 = false;
        $scope.route2 = false;
        $scope.route3 = false;
        $scope.showLoader = false;
        $scope.centerCaptured = false;
        $scope.searchFeatured = true;
        $scope.markersControl = {};

        var previousPosition, isSearching = false;

        if(!window.categories || !window.categories.length){
            CategoriesService
                .get()
                .then(function(c) {
                    if (c.length) {
                        $scope.categories = c.toKeywordsArray();
                        $scope.plainCategories = c.toPlainArray();
                        $scope.categoriesFound = c.length;
                    } else {
                        $scope.categories = [];
                        $scope.plainCategories = [];
                    }
                }, function(error) {
                    $scope.categories = [];
                    $scope.plainCategories = [];
                });
        }else{
            var loadedCategories = CategoriesService.loadCategories(window.categories);

            $scope.categories = loadedCategories.toKeywordsArray();
            $scope.plainCategories = loadedCategories.toPlainArray();
            $scope.categoriesFound = $scope.categories.length;

            window.categories = null;
        }

        $scope.filterCategories = function() {
            var val = $scope.query.trim().toLowerCase().split(' ');
            var results = [];

            val = _.compact(val);
            val = SanitizeService.strings.sanitize(val);

            //If we have keywords
            if (val.length) {
                //Get which categories may have been selected
                _.each(val, function(v) {
                    _.each($scope.plainCategories, function(c) {
                        c = c.split('__');

                        //Check if the substring is found
                        if (c[0].indexOf(val) >= 0) {
                            if (!(c[1] in results)) {
                                results.push(c[1]);
                            }
                        }
                    });
                });

                $scope.categoriesFound = results.length;

                if (results.length) {
                    results = _.uniq(results);

                    _.each($scope.categories, function(c) {
                        if (results.indexOf(c.id) >= 0) {
                            c.selected = true;
                        } else {
                            c.selected = false;
                        }
                    });
                } else {
                    _.each($scope.categories, function(c) {
                        c.selected = false
                    });
                }

                filterMarkersByKeywords($scope.featuredMarkers, val);
            } else {
                //Show all categories when nothing is written
                _.each($scope.categories, function(c) {
                    c.selected = true;
                });
                $scope.categoriesFound = $scope.categories.length;
                showAllFeatured();
            }
        };

        $scope.selectCategory = function(c, autoSearch) {
            $timeout(function(){
                $scope.$apply(function(){
                    $scope.category = c;
                    $scope.query = '';

                    if(autoSearch){
                        $scope.submit();
                    }
                });
            });
            //TODO: Show/hide featured markers
            if(!_.isEmpty($scope.featuredVenues)){
                $scope.featuredMarkers.forEach(function(m){
                    if(c.id === m.data.category){
                        $timeout(function(){
                            $scope.$apply(function(){
                                m.options.visible = true;
                            });
                        });
                    }else if(m.options.visible){
                        $timeout(function(){
                            $scope.$apply(function(){
                                m.options.visible = false;
                            });
                        });
                    }
                });
            }
        };

        $scope.submit = function(form) {
            if(isSearching){
                return;
            }

            if(!_.isEmpty(window.initialVenues)){
                delete window.initialVenues;
            }

            isSearching = true;
            lockPosition(true, false);
            disableMap();

            $scope.clearResults();
            $scope.currentMarker = null;
            $scope.currentModel = null;
            $scope.venue = {};
            $scope.points = [];
            $scope.isSearchFocused = false;
            //$scope.featuredVenues = [];

            ionic.DomUtil.blurAll();

            var p, category;
            var c = $scope.category ? $scope.category.id : false;
            var q = $scope.query && $scope.query.length ? $scope.query.trim() : '';
            var r = $scope.map.circle.radius;
            var position = {coords: {latitude: $scope.map.marker.center.latitude, longitude: $scope.map.marker.center.longitude}};
            var excluded = $scope.featuredVenues.map(function(v){return v.id;});

            var search = '';
            var s = {};

            if(q){
                s.q = q;
            }

            if(r){
                s.radius = r;
            }

            if(c){
                s.category = c;
            }

            s.lat = position.coords.latitude;
            s.lng = position.coords.longitude;

            $location.path('/venues').search(s);
            $location.replace();

            $ionicLoading.show({template: 'Buscando...'});

            $timeout(function(){
                VenuesService
                    .search(position, $rootScope.settings.searchRadius, q, c, excluded)
                    .then(function(venues, keywords) {
                        $timeout(function() {
                            enableMap();
                            $ionicLoading.hide();

                            if(!_.isEmpty($scope.featuredMarkers)){
                                if(c){
                                    filterMarkersByCategoryAndKeywords($scope.featuredMarkers, c, keywords);
                                }else if(keywords){
                                    filterMarkersByKeywords($scope.featuredMarkers, keywords);
                                }
                            }

                            $scope.$apply(function() {
                                $scope.venues = venues;
                                isSearching = false;
                                AnalyticsService.track('search', {position: s.lat + ',' + s.lng, count: venues.length, latitude: s.lat, longitude: s.lng, search: q, radius: r, category: c});
                            });
                        });
                    }, function(error) {
                        enableMap();
                        $ionicLoading.hide();

                        isSearching = false;
                        var featuredFound = 0;

                        if(error.code === 404){
                            featuredFound = filterMarkersByKeywords($scope.featuredMarkers, error.keywords);
                        }

                        if(!featuredFound){
                            $timeout(function(){
                                swal({title: "Error", text: error.message, type: "error", confirmButtonText: "Ok" });
                            });
                        }

                        AnalyticsService.track('error', {position: s.lat + ',' + s.lng, latitude: s.lat, longitude: s.lng, type: 'search', code: error.code, message: error.message, search: q, radius: r, category: c});
                    });
            }, 300);
        };

        $scope.clearCategory = function(){
            $scope.category = false;

            if(!$scope.query || !$scope.query.length){
                $scope.clearResults();
                $scope.currentMarker = null;
                $scope.currentModel = null;
                $scope.points = [];

                $location.path('/venues').search({});
                $location.replace();
            }

            showAllFeatured();

            _.each($scope.categories, function(c) {
                c.selected = true;
            });


        };

        $scope.share = function() {
            var img = $scope.currentModel.getLogo();
            var id = $scope.currentModel.id;
            var basicData = $scope.currentModel.getBasicData();
            var keywords = $scope.currentModel.getTwitterHashtags();

            if ($scope.venues.length > 2) {
                msg = '!Hey! Pude encontrar ' + $scope.currentModel.get('name') + ' y otros ' + $scope.venues.length + ' establecimientos en #' + s.replaceAll($scope.currentModel.getCityName(), ' ', '') + ' usando #jound';
            } else {
                msg = '!Hey! Pude encontrar ' + $scope.currentModel.get('name') + ' en #' + s.replaceAll($scope.currentModel.getCityName(), ' ', '') + ' usando #jound';
            }

            var link = AppConfig.HOST_URL + 'venues/' + id;

            ShareService.share($scope, {
                url: link,
                text: msg,
                description: basicData.name + ' via ' + AppConfig.TWITTER.NAME,
                twitt: msg + ' ' + link,
                hashtags: keywords
            });
        };

        $scope.openVenue = function() {
            VenuesService.current($scope.currentModel);

            $ionicLoading.show();

            $timeout(function(){
                $scope.$apply(function(){
                    AnalyticsService.track('openVenue', {origin: 'home', id: $scope.currentModel.id});
                    $state
                        .go('app.venue', {venueId: $scope.currentModel.id})
                        .then(angular.noop, function(e){
                            AnalyticsService.track('error', {type: 'openVenue', code: e.code, message: e.message, id: $scope.currentModel.id});
                            swal({title: "Error", text: 'Ha ocurrido un error al cargar los datos, hemos reportado el error.', type: "error", confirmButtonText: "Ok" });
                        })
                        .finally(function(){
                            $ionicLoading.hide();
                        });
                });
            });
        };

        $scope.traceRoute = function() {
            if(!$scope.centerCaptured){
                lockPosition();
            }

            var from, to, l, p;
            var onRoute = function(r) {
                if (r.data && r.data.status === 'success') {
                    AnalyticsService.track('traceRoute', {type: 'success'});
                    var routeData = getRoutePoints(r.data.results.routes);

                    if (!routeData.points.length) {
                        return;
                    }

                    var routeConfig = AppConfig.ROUTES.A;
                    var markerStyle;

                    if (!$scope.routes[0]) {
                        routeConfig = routeConfig = AppConfig.ROUTES.A;
                        markerStyle = AppConfig.MARKERS.A_SELECTED;
                    } else if ($scope.routes[0] && !$scope.routes[1]) {
                        routeConfig = routeConfig = AppConfig.ROUTES.B;
                        markerStyle = AppConfig.MARKERS.B_SELECTED;
                    } else if ($scope.routes[0] && $scope.routes[1] && !$scope.routes[2]) {
                        routeConfig = routeConfig = AppConfig.ROUTES.C;
                        markerStyle = AppConfig.MARKERS.D_SELECTED;
                    } else {
                        $scope.routes[2] = null;

                        routeConfig = AppConfig.ROUTES.C;
                        markerStyle = AppConfig.MARKERS.D_SELECTED;
                    }

                    /*
                    $timeout(function() {
                        $scope.$apply(function() {
                            $scope[routeObj] = {
                                name: routeObj,
                                line: polyline,
                                marker: $scope.currentMarker.get('data').id,
                                points: routeConfig.points,
                                distance: routeData.distance
                            };
                            $scope.currentMarker.setIcon(markerStyle);
                        });
                    });*/
                    $scope.routes.push({
                        path: routeData.points,
                        distance: routeData.distance,
                        id: $scope.currentMarker.model.data.objectId,
                        stroke: routeConfig,
                        events: {
                            click: function(line){
                                //console.log('line', line);
                            }
                        }
                    });
                }
            };
            var onRouteFail = function(e) {
                AnalyticsService.track('error', {type: 'traceRoute', code: e.code, message: e.message});
                swal({title: '¡Ups!', text: 'No pudimos trazar la ruta, por favor intenta de nuevo.', type: "error", confirmButtonText: "Ok" });
            };

            l = $scope.currentModel.get('position');
            p = $scope.settings.position;

            from = $scope.map.marker.center.latitude + ',' + $scope.map.marker.center.longitude;
            to = l.latitude + ',' + l.longitude;
            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons: [
                    { text: 'Caminando' },
                    { text: 'En auto' }
                ],
                titleText: '¿Como piensas llegar?',
                cancelText: 'Cancelar',
                buttonClicked: function(index) {
                    var mode;

                    switch(index){
                    case 0:
                        mode = 'walking';
                        break;
                    case 3: return;
                    }

                    AnalyticsService.track('traceRoute', {mode: mode || 'driving', fromLatitude:  p.coords.latitude, fromLongitude:  p.coords.longitude, toLatitude:  l.latitude, toLongitude:  l.longitude, position: l.latitude + ',' + l.longitude});

                    //Get route directions
                    RoutesService
                        .trace(from, to, mode)
                        .then(onRoute, onRouteFail);

                    return true;
                }
            });

            // For example's sake, hide the sheet after two seconds
            $timeout(function() {
                hideSheet();
            }, 3000);
        };

        $scope.removeRoute = function(route) {
            if (!$scope.routes[route]) {
                return;
            }

            $timeout(function() {
                $scope.$apply(function() {
                    $scope.routes.splice(route, 1);
                });
            });

            /*
            $timeout(function() {
                $scope.$apply(function() {
                    route.line.remove();
                    $scope[route.name] = null;

                    _.each($scope.markers, function(m){
                        if(m.get('data').id == route.marker){
                            m.setIcon(AppConfig.MARKERS.VENUE);
                        }
                    });

                    route = null;
                });
            });
            */
        };

        $scope.removeAllRoutes = function() {
            $scope.routes = [];
        };

        $scope.$on('updateFeatured', function(e, exclude){
            if(!exclude && $scope.featuredVenues.length){
                $scope.featuredVenues = [];
            }

            getFeaturedVenues($rootScope.settings.position, $rootScope.settings.searchRadius);
        });

        $scope.$on('$ionicView.leave', function() {
            disableMap();
            $interval.cancel($scope.watchPosition);
            $scope.watchPosition = null;
        });

        $rootScope.$watch('user', function(newUser, prevUser){
            if(newUser && !newUser.isAnonimous()){
                $scope.clearResults();
                $scope.currentMarker = null;
                $scope.currentModel = null;
                $scope.venue = {};
                $scope.points = [];
                $scope.isSearchFocused = false;
                $scope.featuredVenues = [];
            }
        });

        $scope.clearSearch = function(){
            $timeout(function(){
                $scope.$apply(function(){
                    $scope.query = '';

                    if($scope.currentMarker){
                        if($scope.currentMarker.model.featured){
                            $scope.currentMarker.model.icon.url = AppConfig.MARKERS.VENUE_FEATURED.url;
                        }else{
                            $scope.currentMarker.model.icon.url = AppConfig.MARKERS.VENUE.url;
                        }
                    }

                    $scope.clearResults();
                    $scope.currentMarker = null;
                    $scope.currentModel = null;
                    ionic.DomUtil.blurAll();

                    $location.path('/venues').search({});
                    $location.replace();
                });
            });
        };

        $scope.clearResults = function(){
            AnalyticsService.track('clearResults');

            _.each($scope.venues, function(v){v = null;});
            _.each($scope.markers, function(m){m = null;});

            $scope.venues = [];
            $scope.markers = [];
            $scope.removeAllRoutes();
            showAllFeatured();
        };

        function filterMarkersByKeywords($markers, keywords){
            var allFound = 0;

            //console.log('filterMarkersByKeywords', $markers, keywords);

            if(!_.isEmpty($markers)){
                if(_.isEmpty(keywords)){
                    return allFound;
                } else if(_.isString(keywords)){
                    keywords = [keywords];
                }

                allFound = $scope.featuredMarkers.map(function(m){
                    var found = _.intersection(m.data.keywords, keywords);

                    if(found.length){
                        if(!m.options.visible){
                            $timeout(function(){
                                $scope.$apply(function(){
                                    m.options.visible = true;
                                });
                            });
                        }
                    }else if(m.options.visible){
                        $timeout(function(){
                            $scope.$apply(function(){
                                m.options.visible = false;
                            });
                        });
                    }

                    return found.length;
                }).reduce(function(c, p){
                    return p + c;
                });
            }

            return allFound;
        }

        function filterMarkersByCategoryAndKeywords($markers, category, keywords){
            var markers = $markers.filter(function(m){
                var c = m.get('data').category;

                if(c === category){
                    return m;
                }
            });

            if(!_.isEmpty(markers)){
                if(!_.isEmpty(keywords)){
                    filterMarkersByKeywords(markers, keywords);
                }else{
                    markers.forEach(function(m){
                        m.visible = true;
                    });
                }
            }else{
                hideAllFeatured();
            }
        }

        function showAllFeatured(){
            if(!_.isEmpty($scope.featuredMarkers)){
                $scope.featuredMarkers.forEach(function(m){
                    m.options.visible = true;
                });
            }
        }

        function hideAllFeatured(){
            if(!_.isEmpty($scope.featuredMarkers)){
                $scope.featuredMarkers.forEach(function(m){
                    m.options.visible = false;
                    m.icon.url = AppConfig.MARKERS.VENUE_FEATURED.url;
                });
            }
        }

        function disableMap() {
            if ($rootScope.mainMap) {
                $rootScope.mainMap.disabled=true;
            }
        }

        function enableMap() {
            if ($rootScope.mainMap) {
                $rootScope.mainMap.disabled=false;
            }
        }

        function getRoutePoints(routes) {
            var routePoints = [];
            var distance = 0;

            _.each(routes, function(route) {
                _.each(route.legs, function(leg) {
                    distance = leg.distance.text;
                    _.each(leg.steps, function(l) {
                        l.decoded_polyline.forEach(function(pl) {
                            routePoints.push({latitude: pl[0], longitude: pl[1]});
                        });
                    });
                });
            });

            AnalyticsService.track('getRoutePoints', {distance: distance});

            return {
                points: routePoints,
                distance: distance
            };
        }

        $scope.newBusinessMarker = null;
        $scope.newBusiness = angular.copy(NEW_VENUE_MASTER);
        $scope.newBusinessImageDefault = VENUE_DEFAULT_IMAGE.large;
        $scope.base64JPG = BASE_64.JPG;
        $scope.newBusinessImageSRC = '';
        $scope.newVenue = null;
        $scope.startNewBusiness = function(latlng){
            $scope.clearSearch();
            $scope.clearCategory();

            if(!$scope.mainMap || !latlng) {
                return;
            }

            $scope.mainMap.addMarker({
                position: latlng,
                data: {
                    position: latlng
                },
                draggable: true,
                animation: plugin.google.maps.Animation.DROP,
                icon: AppConfig.MARKERS.B_SELECTED
            }, function(marker){
                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.newBusinessMarker = marker;
                        $scope.newBusinessImageSRC = $scope.newBusinessImageDefault;
                    });
                });

                $rootScope.mainMap.animateCamera({
                    target: latlng,
                    zoom: 16,
                    duration: 1000
                });
                $rootScope.$broadcast('venue:new');
            });
        };

        $scope.takePhoto = function(){
            CameraService
                .ready()
                .then(function(){
                    CameraService
                        .take()
                        .then(function(image){
                            $timeout(function(){
                                $scope.$apply(function(){
                                    $scope.newBusinessImageSRC = image;
                                });
                            });
                        }, function(e){
                            $timeout(function(){
                                swal({title: 'Error', text: e.message, type: 'error', confirmButtonText: 'Ok'});
                            });

                        });
                });
        };

        $scope.getNewBusinessAddress = function(){
            var marker = $scope.newBusinessMarker;
            var position;

            if(!marker){
                return;
            }

            position = marker.get('data').position;

            VenuesService
                .getAddressComponents(position)
                .then(function(address){
                    $scope.newVenue.position = position;
                    $scope.newVenue.address = address;

                    openNewBusinessModal();
                }, function(e){
                    $timeout(function(){
                        swal({title: 'Error', text: e.message, type: 'error', confirmButtonText: 'Ok'});
                    });
                });
        };

        var openNewBusinessModal = function(){
            if(!$scope.newBusinessModal){
                $ionicModal.fromTemplateUrl('templates/venue/claim.html', {
                    scope: $scope,
                    animation: 'slide-in-up'
                }).then(function(modal) {
                    $scope.newBusinessModal = modal;
                    $scope.newBusinessModal.show();
                });
            }else{
                $scope.newBusinessModal.show();
            }
        };

        $scope.saveNewBusiness = function(){
            var nb = $scope.newBusiness;
            var marker = $scope.newBusinessMarker;
            var position;

            if(!marker){
                return;
            }

            position = marker.get('data').position;

            //Tell not to use any image if default is selected
            if($scope.newBusinessImageSRC !== $scope.newBusinessImageDefault){
                nb.image = $scope.newBusinessImageSRC;
            }else{
                nb.image = null;
            }

            VenuesService
                .new(position, nb.name, nb.phone, nb.image, nb.owner)
                .then(function(venue){
                    $timeout(function(){
                        $scope.$apply(function(){
                            $scope.newBusinessMarker.remove();
                            $scope.newBusinessMarker = null;
                            $scope.newBusiness = angular.copy(NEW_VENUE_MASTER);
                            $scope.newBusinessImageSRC = $scope.newBusinessImageDefault;
                            $scope.venues = [venue];
                        });
                    });
                }, function(e){
                    $timeout(function(){
                        swal({title: 'Error', text: e.message, type: 'error', confirmButtonText: 'Ok'});
                    });
                });
        };

        $scope.cancelNewBusiness = function(){
            $timeout(function(){
                $scope.$apply(function(){
                    $scope.newBusinessMarker.remove();
                    $scope.newBusinessMarker = null;
                    $scope.newBusiness = angular.copy(NEW_VENUE_MASTER);
                    $scope.newBusinessImageSRC = $scope.newBusinessImageDefault;
                });
            });

            $scope.$emit('venue:new:cancel');
        };

        $scope.clearSelectedVenue = function(){
            onMapClick();
        };

        var getFeaturedVenues = function(p, r) {
            if(!$scope.searchFeatured) {
                return;
            }

            if(_.isEmpty(p) || _.isEmpty(p.coords)){
                return;
            }

            var excludedVenues = $scope.featuredVenues.map(function(v){return v.id;});

            VenuesService
                .getFeatured(p, r, $scope.category.id, excludedVenues)
                .then(function(venues) {
                    AnalyticsService.track('getFeaturedVenues', {radius:  r, latitude:  p.coords.latitude, longitude:  p.coords.longitude, position: p.coords.latitude + ',' + p.coords.longitude});

                    $timeout(function() {
                        $scope.$apply(function() {
                            if(excludedVenues.length){
                                $scope.featuredVenues = $scope.featuredVenues.concat(venues);
                            }else{
                                $scope.featuredVenues = venues;
                            }
                        });
                    });
                }, function(e){
                    AnalyticsService.track('error', {type: 'getFeaturedVenues', radius:  r, latitude:  p.coords.latitude, longitude:  p.coords.longitude, code: e.code, message: e.message, position: p.coords.latitude + ',' + p.coords.longitude});
                });
        };

        var lockPosition = function(lock, showMessage){
            $scope.centerCaptured = lock === false ? false : true;

            if(showMessage === false || !$rootScope.user){
                return;
            }

            var message;
            if($scope.centerCaptured){
                message = 'Posicion capturada';
            }else{
                message = 'Posicion liberada';
            }

            AnalyticsService.track('lockPosition', {release: !!lock});
            toastr.info(message);
        };

        var releasePosition = function(){
            lockPosition(false);
        };

        var mainMarkerClick = function(marker){
            if(!$rootScope.settings.usingGeolocation){
                lockPosition(!$scope.centerCaptured);
            }else{
                toastr.success('Esta es tu posicion, segun la red U_U');
                AnalyticsService.track('position', {type: 'lockedByNetwork'});
            }
        };

        function addVenue(model, isFeatured) {
            var l = model.get('position');
            var $venues = $scope.venues;

            var config = {
                id: model.id,
                icon: {
                    url: AppConfig.MARKERS.VENUE.url,
                    scaledSize: new google.maps.Size(30, 43)
                },
                options: {
                    visible: true
                },
                position: {
                    latitude: l.latitude,
                    longitude: l.longitude
                },
                events: {
                    click: function(marker){
                        $scope.map.center = {
                            latitude: marker.model.data.position.latitude,
                            longitude: marker.model.data.position.longitude
                        };

                        //Highlight marker
                        $timeout(function() {
                            $scope.$apply(function() {
                                var id = marker.model.data.objectId;

                                $scope.currentMarker = marker;
                                $scope.currentModel = $scope.indexedVenues[id] ? $scope.indexedVenues[id] : $scope.indexedFeaturedVenues[id];

                                AnalyticsService.track('venueClick', {id: id, isFeatured: isFeatured});
                            });
                        });
                    }
                },
                data: model.toJSON()
            };

            if(model.get('featured')){
                config.icon.url = AppConfig.MARKERS.VENUE_FEATURED.url;
            }

            if(isFeatured){
                $venues = $scope.featuredVenues;
                $scope.featuredMarkers.push(config);
            }else{
                $scope.markers.push(config);

                if($scope.venues.length === 1 && !$scope.currentMarker){
                    //console.log('select current marker', $scope.markers);

                    //console.log($scope.markersControl.getGMarkers());
                }
            }
        }

        function getCurrentPosition(fromInterval) {
            if (!$scope.map || !$scope.map.marker) {
                return;
            }

            var deferred = $q.defer();

            if(!fromInterval){
                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.tracingPosition = true;
                    });
                });
            }

            if($ionicHistory.currentView().stateName !== 'app.home'){
                deferred.reject({message: 'Home is not active', code: 300});
            }else{
                geolocation
                    .getLocation(AppConfig.GEO.DEFAULT)
                    .then(
                        function(position) {
                            $timeout(function(){
                                $scope.$apply(function(){
                                    $scope.map.marker.options.icon.url = AppConfig.MARKERS.LOCATION.url;
                                    $scope.map.marker.center = {
                                        latitude: position.coords.latitude,
                                        longitude: position.coords.longitude
                                    };
                                    $scope.map.center = angular.copy($scope.map.marker.center);
                                    $scope.tracingPosition = false;
                                });
                            });

                            if(!$rootScope.user){
                                deferred.reject({message: 'User does not longer exists', code: 500});
                            }else{
                                if(($rootScope.settings && !_.isEmpty($rootScope.settings.position)) && _.isEqual(position.coords, $rootScope.settings.position.coords)){
                                    deferred.resolve(position);
                                }else {
                                    if(!$scope.watchPosition){
                                        $scope.watchPosition = $interval(function(){
                                            getCurrentPosition(true);
                                        }, 20000);
                                    }

                                    previousPosition = {coords:{latitude: position.coords.latitude, longitude: position.coords.longitude}};

                                    $rootScope.settings.position = previousPosition;

                                    $rootScope.user.save({
                                        'settings': $rootScope.settings,
                                        'lastPosition': new Parse.GeoPoint({
                                            latitude: position.coords.latitude,
                                            longitude: position.coords.longitude
                                        })
                                    });

                                    AnalyticsService.track('getCurrentPosition', {type: 'success', position: position.coords.latitude + ',' + position.coords.longitude, latitude: position.coords.latitude, longitude: position.coords.longitude});

                                    deferred.resolve(position);
                                }
                            }
                        }, function(e) {
                            $timeout(function(){
                                $scope.$apply(function(){
                                    $scope.tracingPosition = false;
                                });

                                $rootScope.$apply(function(){
                                    $rootScope.settings.usingGeolocation = false;
                                });

                            });

                            AnalyticsService.track('error', {type: 'getCurrentPosition', message: e.message, code: e.code});

                            deferred.reject(e);
                        });
            }

            return deferred.promise;
        }

        var onMapChangeTimeout = null;
        function onMapChange(map) {
            if($rootScope.settings.usingGeolocation || $scope.centerCaptured){
                return;
            }

            var center = map.getCenter();
            var latlng = {lat: center.lat(), lng: center.lng()};
            var position = {coords:{latitude: latlng.lat, longitude: latlng.lng}};

            $timeout(function(){
                $scope.$apply(function(){
                    $scope.map.marker.center = position.coords;
                });
            });

            //Manually center map, don't use centerMap because it changes the camera position too
            $rootScope.settings.position = position;

            if(onMapChangeTimeout){
                $timeout.cancel(onMapChangeTimeout);
            }

            //Create timeout
            onMapChangeTimeout = $timeout(function(){
                var settings = $rootScope.user.get('settings');
                var distance = 0, maxDistanceToRefresh = AppConfig.MAX_DISTANCE_TO_REFRESH;

                settings = $rootScope.settings;

                $rootScope.user.save('settings', settings);
                onMapChangeTimeout = null;

                if(previousPosition){
                    distance = RoutesService.distance(previousPosition, position.coords);
                }

                previousPosition = position;

                if(distance > maxDistanceToRefresh){
                    getFeaturedVenues({coords: {latitude: latlng.lat, longitude: latlng.lng}}, $rootScope.settings.searchRadius);
                }
            }, 1000);
        }

        function tryDefaultPosition(){
            var settings = $rootScope.settings;
            var p;

            if(!_.isEmpty(settings.position) && !_.isEmpty(settings.position.coords)){
                p = settings.position.coords;
                AnalyticsService.track('position', {position: p.latitude + ',' + p.longitude, type: 'fromSettings', latitude: p.latitude, longitude: p.longitude});
            }else{
                p = AppConfig.GEO.DEFAULT_CENTER.coords;
                AnalyticsService.track('warning', {type: 'positionDefault'});
            }

            previousPosition = {lat: p.latitude, lng: p.longitude};

            getFeaturedVenues({coords: p}, $rootScope.settings.searchRadius);

            $timeout(function(){
                $scope.$apply(function(){
                    $scope.map.marker.options.icon.url = AppConfig.MARKERS.LOCATION_CUSTOM.url;
                    $scope.map.center = {
                        latitude: p.latitude,
                        longitude: p.longitude
                    };

                    $scope.map.marker.center = angular.copy($scope.map.center);
                    $scope.map.circle.center = angular.copy($scope.map.center);
                    releasePosition();
                });
            });

            AnalyticsService.track('usingGelocationChange', {using: false, freestyle: 'true'});
        }

        $scope.$watch('isSearchFocused', function(focused) {
            if ($rootScope.mainMap) {
                $rootScope.mainMap.disabled = focused;
            }
        });

        $rootScope.$watch('settings.searchRadius', function(radius) {
            if ($scope.map.circle && _.isNumber(radius) && radius > 0) {
                AnalyticsService.track('searchRadiusChange', {radius: radius});

                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.map.circle.radius = radius;
                    });
                });
            }else{
                AnalyticsService.track('error', {type: 'usingGelocationChange', message: 'No circle or radius defined', radius:  radius, circle: !!$rootScope.circle});
            }
        });

        $rootScope.$watch('settings.usingGeolocation', function(using) {
            if(!_.isEmpty(window.initialVenues)){
                return;
            }

            if (using) {
                AnalyticsService.track('usingGelocationChange', {using: 'true'});
                getCurrentPosition()
                    .then(function(position){
                        if(position){
                            getFeaturedVenues(position, $rootScope.settings.searchRadius);
                        }else{
                            tryDefaultPosition();
                        }
                    }, function(e){
                        $timeout(function(){
                            AnalyticsService.track('error', {type: 'getCurrentPosition', message: 'Error getting position, fallback to defaults', code: 4});
                            swal({   title: "Error",   text: 'Ha ocurrido un error al intentar trazar tu ubicacion, por favor intenta la busqueda manual.',   type: "error",   confirmButtonText: "Ok :(" });
                            tryDefaultPosition();
                        });
                    });

            } else {

                if($scope.watchPosition){
                    $interval.cancel($scope.watchPosition);
                    $scope.watchPosition = null;
                }

                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.map.marker.options.icon.url = AppConfig.MARKERS.LOCATION_CUSTOM.url;
                    });
                });

                releasePosition();

            }
        });

        $scope.$watch('venues', function(venues) {
            var v = venues.map(function(v){return v.id;});

            if($rootScope.settings && $rootScope.settings.position && $rootScope.settings.position.coords){
                AnalyticsService.track('venuesChange', {total: venues.length, venues: v.toString(), position: $rootScope.settings.position.coords.latitude + ',' + $rootScope.settings.position.coords.longitude});
            }

            if ($scope.markers.length) {
                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.markers = [];
                        $scope.venues = [];
                    });
                });
            }
            //Add all venues to the map
            if (venues.length) {
                $scope.indexedVenues = _.indexBy(venues, 'id');

                _.each(venues, function(v) {
                    addVenue(v);
                });
            }else{
                $scope.indexedVenues = {};
            }
        });

        $scope.$watch('featuredVenues', function(venues, oldVenues){
            var v = venues.map(function(v){return v.id;});

            if($scope.featuredMarkers.length){
                _.each($scope.featuredMarkers, function(m){
                    //TODO: Enhance this
                    //      Keep current selected featured marker if present in new results
                    //Release selected model if it has dissapeared
                    if($scope.currentMarker && $scope.currentMarker.model.id === m.model.id){
                        $scope.currentMarker = null;
                    }

                    m = null;
                });

                $scope.featuredMarkers = [];
            }

            if(venues.length){
                $scope.indexedFeaturedVenues = _.indexBy(venues, 'id');

                _.each(venues, function(v){
                    addVenue(v, true);
                });
            }else{
                $scope.indexedFeaturedVenues = {};
            }
        });

        $scope.$watch('currentMarker', function(next, previous){
            if(previous){
                if(previous.model.data.featured){
                    previous.model.icon.url = AppConfig.MARKERS.VENUE_FEATURED.url;
                }else{
                    previous.model.icon.url = AppConfig.MARKERS.VENUE.url;
                }
            }

            if(next){
                if(next.model.data.featured){
                    next.model.icon.url = AppConfig.MARKERS.VENUE_SELECTED_FEATURED.url;
                }else{
                    next.model.icon.url = AppConfig.MARKERS.VENUE_SELECTED.url;
                }
            }
        });

        $scope.$watch('map.marker.center', function(next){
            if(next){
                if($scope.routes && $scope.routes.length){
                    $scope.removeAllRoutes();
                }

                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.map.circle.center = {
                            latitude: next.latitude,
                            longitude: next.longitude
                        };
                    });
                });
            }
        });

        $scope.map = {
            control: {},
            center: {
                latitude: AppConfig.GEO.DEFAULT_CENTER.coords.latitude,
                longitude: AppConfig.GEO.DEFAULT_CENTER.coords.longitude
            },
            zoom: AppConfig.MAP.DEFAULT.zoom,
            circle: angular.extend({}, AppConfig.RADIUS.DEFAULT, {
                center: {
                    latitude: AppConfig.GEO.DEFAULT_CENTER.coords.latitude,
                    longitude: AppConfig.GEO.DEFAULT_CENTER.coords.longitude
                },
                events: {
                    radius_changed: function(c){
                        c.map.fitBounds(c.getBounds());
                    }
                }
            }),
            options: AppConfig.MAP.DEFAULT,
            marker: {
                id: 'mainMarker',
                control: {},
                options: {
                    icon: {
                        url: AppConfig.MARKERS.LOCATION.url
                    }
                },
                events: {
                    click: mainMarkerClick
                },
                center: {
                    latitude: AppConfig.GEO.DEFAULT_CENTER.coords.latitude,
                    longitude: AppConfig.GEO.DEFAULT_CENTER.coords.longitude
                }
            },
            events: {
                dragend: onMapChange
            }
        };

        $scope.$on('$ionicView.enter', function(){
            enableMap();

            if($scope.map && _.isFunction($scope.map.control.refresh)){
                $scope.map.control.refresh();
            }

            var clearSearchButton = angular.element(document.getElementById('home-search-clear'));
            var searchBoxPosition = $ionicPosition.position(angular.element(document.getElementById('home-search-box')));
            var position = searchBoxPosition.left + searchBoxPosition.width;

            $timeout(function(){
                $scope.$apply(function(){
                    clearSearchButton.css('left', position + 'px');
                });
            });

            AnalyticsService.track('home', {type: 'enter'});
        });

        $scope.$on('venue:new:frommenu', function(){
            $rootScope.mainMap.getCameraPosition(function(c){
                $scope.startNewBusiness(c.target);
            });
        });

        $scope.$on('$ionicView.beforeLeave', function() {
            disableMap();
            AnalyticsService.track('home', {type: 'beforeLeave'});
        });

        $scope.$watch('map.circle.getCircle', function(g, p, scope){
            if(_.isFunction(g) && g !== p){
                var bounds = g().getBounds();
                if(!_.isEmpty(bounds)){
                    var ne = bounds.getNorthEast();
                    var sw = bounds.getSouthWest();

                    var northeast = {latitude: ne.lat(), longitude: ne.lng()};
                    var southwest = {latitude: sw.lat(), longitude: sw.lng()};

                    $scope.map.bounds = {northeast: northeast, southwest: southwest};
                }
            }
        });

        uiGmapGoogleMapApi.then(function(maps) {
            var settings = $rootScope.settings;
            var search = $location.search();

            $scope.map.marker.options.icon.scaledSize = new google.maps.Size(20, 20);
            $scope.map.marker.options.icon.anchor = new google.maps.Point(10, 10);
            $scope.map.options.zoomControlOptions.position = google.maps.ControlPosition.RIGHT_CENTER;
            $scope.map.options.panControlOptions.position = google.maps.ControlPosition.RIGHT_BOTTOM;
            $scope.map.options.mapTypeControlOptions.position = google.maps.ControlPosition.RIGHT_TOP;

            if(search && search.radius && search.lat && search.lng){
                $rootScope.settings.usingGeolocation = false;

                if(search.category){
                    var category = $scope.categories.filter(function(c){
                        if(c.id === search.category){
                            return c;
                        }
                    });

                    if(category.length){
                        $scope.category = category[0];
                    }
                }

                $timeout(function(){
                    $scope.$apply(function(){
                        $scope.query = search.q;
                        $scope.map.center = {
                            latitude: search.lat*1,
                            longitude: search.lng*1
                        };

                        $scope.map.marker.options.icon.url = AppConfig.MARKERS.LOCATION_CUSTOM.url;
                        $scope.map.marker.center = angular.copy($scope.map.center);
                        $scope.map.circle.center = angular.copy($scope.map.center);
                        $rootScope.settings.searchRadius = search.radius ? search.radius *1 : AppConfig.RADIUS.DEFAULT.radius;

                        if(window.initialVenues && window.initialVenues.length){
                            $scope.venues = window.initialVenues.map(function(v){
                                return VenuesService.convertToParseObject(v);
                            });

                            previousPosition = {lat: search.lat*1, lng:search.lng*1};
                        }else{
                            swal({text: 'No se encontraron establecimientos, por favor intente con otros parametros de busqueda.', type: 'error', title: 'Ouch!', confirmButtonText: 'Ok :('});
                        }
                    });
                });
            }

            $rootScope.mainMap = {};
        });
    });
