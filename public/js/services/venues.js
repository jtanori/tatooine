angular.module('jound.services')

.factory('VenueModel', function(AppConfig){
    return Parse.Object.extend('Location', {
        pageLoaded: false,
        getURL: function(){
            return '//www.jound.mx/venue/' + this.id;
        },
        getWWW: function(){
            if(this.get('www')){
                return this.get('www').replace(/^(https?|ftp):\/\//, '');
            }
        },
        getAddress: function(){
            var address = '';
            var n = this.get('exterior_number');
            var castedN = parseInt(n, 10);

            if(!_.isEmpty(this.get('road_type'))){
                address += this.escape('road_type') + ' ' + this.escape('road_name');
            }

            if(!_.isEmpty(this.get('road_type_1'))){
                address += ' entre ' + this.escape('road_type_1') + ' ' + this.escape('road_name_1');
            }

            if(!_.isEmpty(this.get('road_type_2'))){
                address += ' y ' + this.escape('road_type_2') + ' ' + this.escape('road_name_2');
            }

            if(n){
                if(!_.isNaN(castedN) && _.isNumber(castedN)){
                    address += ' #' + _.escape(n);
                }else if(!_.isString(n)){
                    if(n === 'SN' || n === 'sn'){
                        address += ' Sin numero';
                    }else {
                        address += ' #' + _.escape(n);
                    }
                }
            }

            return address;
        },
        getVecinity: function(){
            var address = '';

            if(this.get('settling_type') && this.get('settling_name')){
                address += this.get('settling_type') + ' ' + this.get('settling_name');
            }else if(this.get('settling_name')){
                address += 'Colonia ' + this.get('settling_name');
            }

            return address;
        },
        getCityName: function(){
            var city = '';
            var l = this.get('locality');
            var m = this.get('municipality');

            if(!_.isEmpty(l)){
                city = l;
            }else{
                city = m;
            }

            return city;
        },
        getCity: function(){
            var city = '';
            var l = this.get('locality');
            var m = this.get('municipality');
            var s = this.get('federal_entity');

            if(l === m){
                city += l + ', ' + s;
            }else {
                city += l + ', ' + m + ', ' + s;
            }

            if(this.get('postal_code')){
                city += ' C.P ' + this.escape('postal_code');
            }

            return city;
        },
        getBanner: function(){
            var l;

            try {
                l = this.get('cover').file ? this.get('cover').file : this.get('cover').get('file');

                if(l.url){
                    return {url: l.url(), isDefault: false};
                }else if(l._url){
                    return {url: l._url, isDefault: false};
                }
            }catch(e){
                return {url:'img/splash.jpg', isDefault: true};
            }
        },
        getLogo: function(){
            var l;

            try {
                l = this.get('logo').file ? this.get('logo').file : this.get('logo').get('file');

                if(l.url){
                    return {url: l.url(), isDefault: false};
                }else if(l._url){
                    return {url: l._url, isDefault: false};
                }
            }catch(e){
                return {url:'img/venue_default_large.jpg', isDefault: true};
            }
        },
        getHashTags: function(){
            var keywords = this.get('keywords').map(function(h){
                if(h[0] === '#' || h[0] === '@'){
                    return h;
                }else{
                    return '#' + h;
                }
            });

            return keywords;
        },
        getTwitterHashtags: function(){
            var tags = this.getHashTags();

            if(tags.length >= 5){
                tags.splice(5, tags.length - 1);
            }

            return tags;
        },
        getBasicData: function(){
            return {
                name: this.get('name'),
                address: this.getAddress(),
                city: this.getCity(),
                vecinity: this.getVecinity(),
                phoneNumber: this.get('phone_number'),
                url: this.get('www'),
                activity: this.get('activity_description'),
                logo: this.getLogo(),
                banner: this.getBanner(),
                email: this.get('email_address'),
                www: this.getWWW()
            };
        }
    });
})
.factory('CategoryModel', function(){
    return Parse.Object.extend({className: 'Category'});
})
.factory('VenuesService', function($q, $http, $rootScope, VenueModel, SanitizeService, CategoryModel, AppConfig, User, Facebook) {

    var _currentResults = [];
    var _currentVenue;

    return {
        //Search by query, position and category
        //TODO: User search service instead
        search: function(p, r, q, c){
            var deferred = $q.defer();

            if(!p || !r){
                deferred.reject({message: 'VenuesService.search requires at least two arguments', code: 101});
            }

            var query = new Parse.Query(VenueModel);
            var category;
            var geoPoint = new Parse.GeoPoint({latitude: p.coords.latitude, longitude: p.coords.longitude});

            if(q){
                q = q.split(' ');
                q = _.chain(q).compact().uniq().invoke('trim').invoke('toLowerCase').value();

                if(q.length === 1){
                    query.equalTo('keywords', q[0].toLowerCase());
                }else if(q.length > 1){
                    query.containsAll('keywords', SanitizeService.strings.sanitize(q));
                }
            }

            if(c && c !== 'all'){
                category = new CategoryModel();
                category.id = c;
                query.equalTo('category', category);
            }

            //Search near current position
            query
                .near('position', geoPoint)
                .withinKilometers('position', geoPoint, r/1000)
                .include(['logo', 'cover', 'page', 'claimed_by'])
                .select(AppConfig.QUERY.VENUE_DEFAULT_FIELDS)
                .limit(200)
                .find()
                .then(
                    function(results){
                        if(results.length){
                            //Remove duplicates
                            results = _.uniq(results, true, function(r){
                                return r.get('name') + '-' + r.get('position').latitude + '-' + r.get('position').longitude;
                            });

                            _currentResults = results;
                            deferred.resolve(results);
                        }else{
                            deferred.reject({message: 'No encontramos resultados, intenta buscar en un rango mas amplio.'});
                        }
                    }, function(e){
                        deferred.reject(e);
                    }
                );

            return deferred.promise;
        },
        getFeatured: function(p, r){
            var deferred = $q.defer();

            if(!p || !r){
                deferred.reject({message: 'VenuesService.getFeatured requires at least two arguments', code: 101});
            }

            var query = new Parse.Query(VenueModel);
            var geoPoint = new Parse.GeoPoint({latitude: p.coords.latitude, longitude: p.coords.longitude});

            //Search near current position
            Parse.Config
                .get()
                .then(function(c){
                    var r = {
                        limit: c.get('defaultFeaturedLimit') || 50,
                        radius: c.get('defaultFeaturedRadius') || $rootScope.settings.searchRadius
                    };

                    query
                        .select(AppConfig.QUERY.VENUE_DEFAULT_FIELDS)
                        .near('position', geoPoint)
                        .withinKilometers('position', geoPoint, r.radius/1000)
                        .include(['logo', 'cover', 'page', 'claimed_by'])
                        .equalTo('featured', true)
                        .limit(r.limit)
                        .find()
                        .then(
                            function(results){
                                if(results.length){
                                    _currentResults = results;
                                    deferred.resolve(results);
                                }else{
                                    deferred.reject({message: 'No encontramos resultados, intenta buscar en un rango mas amplio.'});
                                }
                            }, function(e){
                                deferred.reject(e);
                            }
                        );
                }, function(e){
                    deferred.reject(e);
                });

            return deferred.promise;
        },
        getById: function(id){
            var deferred = $q.defer();
            var found = false, query;

            if(_currentResults.length){
                found = _.find(_currentResults, function(v){
                    return v.id === id;
                });
            }else if(_currentVenue && _currentVenue.id === id){
                return _currentVenue;
            }

            if(found){
                deferred.resolve(found);
            }else{
                $http
                    .get(AppConfig.API_URL + 'venue/' + id)
                    .then(function(response){
                        var v = new VenueModel();
                        var P = Parse.Object.extend('Page');
                        var L = Parse.Object.extend('File');
                        var p, l, c;

                        v.set(response.data.venue);

                        if(response.data.venue){
                            if(response.data.venue.page){
                                p = new P(response.data.venue.page);
                                v.set('page', p);
                            }
                            if(response.data.venue.logo){
                                l = new L(response.data.venue.logo);
                                v.set('logo', l);
                            }
                            if(response.data.venue.cover){
                                c = new L(response.data.venue.cover);
                                v.set('cover', c);
                            }
                        }

                        deferred.resolve(v);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        convertToParseObject: function(venue){
            var v = new VenueModel();
            var P = Parse.Object.extend('Page');
            var L = Parse.Object.extend('File');
            var p, l, c;

            v.set(venue);

            if(venue){
                if(venue.page){
                    p = new P(venue.page);
                    v.set('page', p);
                }
                if(venue.logo){
                    l = new L(venue.logo);
                    v.set('logo', l);
                }
                if(venue.cover){
                    c = new L(venue.cover);
                    v.set('cover', c);
                }
            }

            return v;
        },
        getChannel: function(config){
            var deferred = $q.defer();

            if(!config){
                deferred.reject({message: 'No channel config provided'});
            } else {

                if(config.type === 'facebook'){
                    Facebook
                        .getLoginStatus(function(response){
                            if(response && response.status === 'connected'){
                                config.accessToken = response.authResponse.accessToken;

                                $http
                                    .post(AppConfig.API_URL + 'getChannelForVenue', config)
                                    .then(function(response){
                                        deferred.resolve(response.data);
                                    }, function(e){
                                        deferred.reject(e);
                                    });
                            }else{
                                Facebook
                                    .login(function(response){
                                        config.accessToken = response.authResponse.accessToken;

                                        $http
                                            .post(AppConfig.API_URL + 'getChannelForVenue', config)
                                            .then(function(response){
                                                deferred.resolve(response.data);
                                            }, function(e){
                                                deferred.reject(e);
                                            });
                                    }, function(e){
                                        deferred.reject(e);
                                    });
                            }
                        }, function(e){
                            deferred.reject(e);
                        });
                }else{
                    $http
                        .post(AppConfig.API_URL + 'getChannelForVenue', config)
                        .then(function(response){
                            deferred.resolve(response.data);
                        }, function(response){
                            deferred.reject(response);
                        });
                }
            }

            return deferred.promise;
        },
        getProductsForVenue: function(venueId, skip){
            var deferred = $q.defer();
            var config = {id: venueId};

            if(skip && _.isNumber(skip) && skip > 0){
                config.skip = skip;
            }

            $http
                .post(AppConfig.API_URL + 'getProductsForVenue', config)
                .then(function(response){
                    deferred.resolve(response.data.results);
                }, function(response){
                    deferred.reject(response);
                });

            return deferred.promise;
        },
        getReviewsForVenue: function(venueId, skip, pageSize, sinceDate, maxDate){
            var deferred = $q.defer();
            var config = {id: venueId};

            if(skip && _.isNumber(skip) && skip > 0){
                config.skip = skip;
            }

            if(pageSize && _.isNumber(pageSize)){
                config.pageSize = pageSize;
            }

            if(sinceDate){
                config.sinceDate = sinceDate;
                config.skip = 0;
            }

            if(maxDate){
                config.maxDate = maxDate;
                config.skip = 0;
            }

            $http
                .post(AppConfig.API_URL + 'getReviewsForVenue', config)
                .then(function(response){
                    deferred.resolve(response.data.results);
                }, function(response){
                    deferred.reject(response);
                });

            return deferred.promise;
        },
        getDealsForVenue: function(venueId, skip){
            var deferred = $q.defer();
            var config = {id: venueId};

            if(skip && _.isNumber(skip) && skip > 0){
                config.skip = skip;
            }

            $http
                .post(AppConfig.API_URL + 'getDealsForVenue', config)
                .then(function(response){
                    deferred.resolve(response.data.results);
                }, function(response){
                    deferred.reject(response);
                });

            return deferred.promise;
        },
        getEventsForVenue: function(venueId, skip){
            var deferred = $q.defer();
            var config = {id: venueId};

            if(skip && _.isNumber(skip) && skip > 0){
                config.skip = skip;
            }

            $http
                .post(AppConfig.API_URL + 'getEventsForVenue', config)
                .then(function(response){
                    deferred.resolve(response.data.results);
                }, function(response){
                    deferred.reject(response);
                });

            return deferred.promise;
        },
        saveReview: function(id, text, userId, rating){
            var deferred = $q.defer();
            var config = {id: id, text: text, rating: rating, userId: userId};

            if(_.isEmpty(id)) {
                deferred.reject('No venue ID provided');
            }else if(_.isEmpty(text)) {
                deferred.reject('No review to post provided');
            }else if(_.isEmpty(userId)) {
                deferred.reject('No user ID provided');
            }else {
                $http
                    .post(AppConfig.API_URL + 'saveReviewForVenue', config)
                    .then(function(response){
                        deferred.resolve(response.data.results);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        updatePage: function(id, attr, val){
            var deferred = $q.defer();

            if(_.isEmpty(attr)) {
                deferred.reject('Please provide an attribute to update');
            }else if(_.isEmpty(id)) {
                deferred.reject('Please provide a page id');
            }else {
                $http
                    .post(AppConfig.API_URL + 'updatePage', {id: id, attr: attr, val: val})
                    .then(function(response){
                        deferred.resolve(response.data.results);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        current: function(venue){
            if(venue){
                _currentVenue = venue;
            }

            return _currentVenue;
        },
        claim: function(id, details){
            var deferred = $q.defer();

            if(_.isEmpty(details)) {
                deferred.reject('Please provide details object.');
            }else if(_.isEmpty(User.current())) {
                deferred.reject('Please login to claim a business');
            }else {
                $http
                    .post(AppConfig.API_URL + 'claimVenue', {id: id, userId: User.current().id, details: details})
                    .then(function(response){
                        deferred.resolve(response.data.results);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        isClaimed: function(id){
            var deferred = $q.defer();

            if(_.isEmpty(id)) {
                deferred.reject('Please provide a venue id.');
            }else {
                $http
                    .post(AppConfig.API_URL + 'venueIsClaimed', {id: id})
                    .then(function(response){
                        deferred.resolve(response.data.results);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        report: function(id, details, problemType){
            if($rootScope.user.isAnonimous()){
                //TODO: Add login window
                return;
            }
            //Fix this for web
            var device = $cordovaDevice.getDevice();
            var cordova = $cordovaDevice.getCordova();
            var model = $cordovaDevice.getModel();
            var platform = $cordovaDevice.getPlatform();
            var uuid = $cordovaDevice.getUUID();
            var version = $cordovaDevice.getVersion();
            var userId = User.current().id;
            var parseVersion = Parse.VERSION;
            var deferred = $q.defer();

            if(_.isEmpty(id)) {
                deferred.reject('Please provide a venue id.');
            }else {
                $http
                    .post(AppConfig.API_URL + 'report', {
                        id: id,
                        userId: User.current().id,
                        device: device,
                        cordova: cordova,
                        model: model,
                        platform: platform,
                        uuid: uuid,
                        version: version,
                        parseVersion: parseVersion,
                        details: details,
                        problemType: problemType
                    })
                    .then(function(response){
                        deferred.resolve(response.data.results);
                    }, function(response){
                        deferred.reject(response);
                    });
            }

            return deferred.promise;
        },
        new: function(p, name, phone, image, isOwner){
            var deferred = $q.defer();
            var File = Parse.Object.extend('File');
            var P = Parse.Object.extend('Page');
            var F,file, f;
            var save = function(savedFile){
                var config = {
                    position: p,
                    name: name,
                    phone: phone,
                    userId: User.current().id
                };

                if(isOwner){
                    config.owner = true;
                }

                if(savedFile && savedFile.id){
                    config.imageId = savedFile.id;
                }

                plugin.google.maps.Geocoder.geocode({position: p}, function(results) {
                    if (results.length) {
                        config.address = results[0];
                    }

                    $http
                        .post(AppConfig.API_URL + 'newVenue', config)
                        .then(function(response){
                            var v = new VenueModel();

                            v.set(response.data.venue);

                            deferred.resolve(v);
                        }, function(response){
                            deferred.reject(response);
                        });
                });


            }

            if(_.isEmpty(p) || _.isEmpty(name) || _.isEmpty(phone)) {
                deferred.reject('Please provide a position, name and phone number.');
            }else {
                if(image){
                    F = new Parse.File('front-image', {base64: image});
                    F
                        .save()
                        .then(function(savedFile){
                            f = new File({file: savedFile})
                            f
                                .save()
                                .then(function(){
                                    save(f);
                                }, function(e){
                                    deferred.reject(e);
                                })
                        }, function(e){
                            deferred.reject(e);
                        })

                }else{
                    save();
                }
            }

            return deferred.promise;
        },

        getAddressComponents: function(p){
            var deferred = $q.defer();

            $http
                .post(AppConfig.API_URL + 'address', {
                    extended: true,
                    latitude: p.lat,
                    longitude: p.lng
                })
                .then(function(response){
                    deferred.resolve(response.data.results);
                }, function(response){
                    deferred.reject(response.data.error);
                });

            return deferred.promise;
        },

        savePhotoForVenue: function(data, id){
            var deferred = $q.defer();

            $http
                .post(AppConfig.API_URL + 'savePhotoForVenue', {
                    id: id,
                    data: data
                })
                .then(function(response){
                    deferred.resolve(response.data.url);
                }, function(response){
                    deferred.reject(response.data.error);
                });

            return deferred.promise;
        },

        getEventById: function(eventId){
            var deferred = $q.defer();

            $http
                .post(AppConfig.API_URL + 'getEventById', {
                    id: eventId
                })
                .then(function(response){
                    console.log(response, 'response from server');
                    deferred.resolve(response.data);
                }, function(response){
                    deferred.reject(response.data.error);
                });

            return deferred.promise;
        }
    };
});
